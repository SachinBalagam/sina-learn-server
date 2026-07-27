import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        roles: {
          select: {
            id: true,
            name: true,
            permissions: true,
          }
        },
        isActive: true,
        organizationId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('AUTH_ACCOUNT_DISABLED');
    }

    let finalUser = { ...user };

    // Self-healing: if logged in user owns an organization but organizationId is null, link them.
    if (!user.organizationId) {
      const ownedOrg = await this.prisma.organization.findFirst({
        where: { ownerId: user.id },
      });
      if (ownedOrg) {
        const ownerRole = await this.prisma.role.findFirst({
          where: { name: 'Owner', organizationId: ownedOrg.id },
        });
        const updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            organizationId: ownedOrg.id,
            role: 'ORGANIZATION_OWNER',
            roles: ownerRole ? { connect: [{ id: ownerRole.id }] } : undefined,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            roles: {
              select: {
                id: true,
                name: true,
                permissions: true,
              }
            },
            isActive: true,
            organizationId: true,
          },
        });
        finalUser = { ...updatedUser };
      }
    }

    // Attach dynamic permissions (from db Role) or fall back to static registry permissions
    const permissions: string[] = finalUser.roles?.flatMap(r => r.permissions) || [];

    if (finalUser.role === 'PLATFORM_SUPER_ADMIN') {
      const overrideOrgId = req.headers['x-superadmin-org-override'];
      if (overrideOrgId && typeof overrideOrgId === 'string' && overrideOrgId.trim() !== '') {
        finalUser.organizationId = overrideOrgId;
      }
    }

    return {
      ...finalUser,
      permissions,
    };
  }
}

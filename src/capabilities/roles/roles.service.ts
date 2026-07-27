import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permissions } from '../../common/permissions/permission.registry';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { name: dto.name, organizationId: orgId },
    });

    if (existing) {
      throw new ConflictException('A role with this name already exists in your organization.');
    }

    if (dto.permissions) {
      const validPermissions = Object.values(Permissions);
      const invalidPerms = dto.permissions.filter((p) => !validPermissions.includes(p as any));
      if (invalidPerms.length > 0) {
        throw new BadRequestException(`Invalid permissions: ${invalidPerms.join(', ')}`);
      }
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string) {
    if (!orgId) return [];
    return this.prisma.role.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }

  async update(orgId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(orgId, id);

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: dto.name, organizationId: orgId },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists.');
      }
    }

    if (dto.permissions) {
      const validPermissions = Object.values(Permissions);
      const invalidPerms = dto.permissions.filter((p) => !validPermissions.includes(p as any));
      if (invalidPerms.length > 0) {
        throw new BadRequestException(`Invalid permissions: ${invalidPerms.join(', ')}`);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async remove(orgId: string, id: string) {
    const role = await this.findOne(orgId, id);

    // Check if any users are assigned to this role
    const usersCount = await this.prisma.user.count({
      where: { roles: { some: { id } } },
    });

    if (usersCount > 0) {
      throw new ConflictException('Cannot delete role because it is currently assigned to users.');
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }
}

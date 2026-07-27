import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createUserSchema, updateUserSchema } from '../../shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission(Permissions.USERS_CREATE)
  async create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermission(Permissions.USERS_READ)
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.usersService.findAll(orgId);
  }

  @Get('search')
  @RequirePermission(Permissions.USERS_READ)
  async search(@CurrentUser('organizationId') orgId: string, @Query('q') query: string) {
    return this.usersService.search(orgId, query);
  }

  @Get(':id')
  @RequirePermission(Permissions.USERS_READ)
  async findById(@Param('id') id: string, @CurrentUser() requester: any) {
    return this.usersService.findById(id, requester);
  }

  @Patch(':id')
  @RequirePermission(Permissions.USERS_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() requester: any) {
    return this.usersService.update(id, dto, requester);
  }

  @Delete(':id')
  @RequirePermission(Permissions.USERS_DELETE)
  async remove(@Param('id') id: string, @CurrentUser() requester: any) {
    return this.usersService.remove(id, requester);
  }
}

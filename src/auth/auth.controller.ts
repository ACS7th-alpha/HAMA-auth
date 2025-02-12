// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Delete,
  Put,
  Param,
} from '@nestjs/common';
import { UpdateChildDto } from './dto/update-child.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google/login')
  async googleLogin(@Body() userData) {
    return this.authService.googleLogin(userData);
  }

  @Post('register')
  async registerUser(@Body() body) {
    return await this.authService.registerUser(body.user, body.additionalInfo);
  }

  @Post('refresh')
  async refreshAccessToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req) {
    return this.authService.logout(req.user);
  }

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  async updateUser(@Req() req, @Body() updateData) {
    return this.authService.updateUser(req.user, updateData);
  }

  @Delete('delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Req() req) {
    return this.authService.deleteUser(req.user);
  }

  @Post('children')
  @UseGuards(JwtAuthGuard)
  async addChild(@Body() childData: UpdateChildDto, @Req() req) {
    const googleId = req.user.userId;
    console.log(googleId);
    return this.authService.addChild(googleId, childData);
  }

  @Put('children/:childName')
  @UseGuards(JwtAuthGuard)
  async updateChild(
    @Param('childName') childName: string,
    @Body() updateData: UpdateChildDto,
    @Req() req,
  ) {
    const googleId = req.user.userId;
    return this.authService.updateChild(googleId, childName, updateData);
  }

  @Delete('children/:childName')
  @UseGuards(JwtAuthGuard)
  async deleteChild(@Param('childName') childName: string, @Req() req) {
    const googleId = req.user.userId;
    return this.authService.deleteChild(googleId, childName);
  }
}

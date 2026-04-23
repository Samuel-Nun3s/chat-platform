import { Body, Controller, Get, Patch, Query, Request, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UpdateUserDto } from "./dto/update-user.dto";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor (private readonly userService: UsersService) {}

  @Get("me")
  me(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @Patch("me")
  update(@Request() req, @Body() dto: UpdateUserDto) {
    return this.userService.update(req.user.id, dto)
  }

  @Get("search")
  search(@Query('q') query: string) {
    return this.userService.search(query);
  }
}
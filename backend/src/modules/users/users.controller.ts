import { BadRequestException, Body, Controller, Get, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { randomUUID } from "crypto";
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

  @Post("me/avatar")
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
        return cb(new BadRequestException('Only JPEG, PNG, GIF and WebP images are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.userService.updateAvatar(req.user.id, `/uploads/avatars/${file.filename}`);
  }

  @Get("search")
  search(@Query('q') query: string) {
    return this.userService.search(query);
  }
}

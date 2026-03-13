import { User } from "@prisma/client";
import { UserResponseDTO } from "../dtos/user/user-response.dto";

export const toUserResponseDTO = (user: User): UserResponseDTO => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
})
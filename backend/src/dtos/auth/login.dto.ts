import { UserResponseDTO } from "../user/user-response.dto";

export interface LoginResponseDTO {
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string; 
}
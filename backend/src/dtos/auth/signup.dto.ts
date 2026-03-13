import { UserResponseDTO } from "../user/user-response.dto";

export interface SignupResponseDTO {
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string; 
}
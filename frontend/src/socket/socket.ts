import io, { Socket } from "socket.io-client";
import { BACKEND_URL } from "../utils/constants";

export const socket: Socket = io(BACKEND_URL);

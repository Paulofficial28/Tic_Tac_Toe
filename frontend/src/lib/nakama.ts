import { Client } from '@heroiclabs/nakama-js';
import type { Session, Socket } from '@heroiclabs/nakama-js';

const useSSL = false; // set to true in production
const client = new Client("defaultkey", "localhost", "7350", useSSL);

export let session: Session | null = null;
export let socket: Socket | null = null;

export const authenticate = async (deviceId: string, username?: string) => {
  session = await client.authenticateDevice(deviceId, true, username);
  return session;
};

export const connectSocket = async () => {
  if (!session) throw new Error("Not authenticated");
  
  socket = client.createSocket(useSSL, false);
  await socket.connect(session, true);
  return socket;
};

export const getClient = () => client;
export const getSession = () => session;
export const getSocket = () => socket;

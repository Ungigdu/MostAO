export enum MostAoActions {
  QueryHandle = "QueryHandle",
  GetProfile = "GetProfile",
  EstablishSession = "EstablishSession",
}

export type HandleType = {
  owner: string;
  pid: string;
  handle: string;
  registered: boolean;
};

export type ProfileType = {
  bio?: string;
  name?: string;
  pubkey: string;
  img?: string;
};

export type HandleProfileType = HandleType & ProfileType;

export type Messages = {
  content: string;
  generation: number;
  id: number;
  sender: string;
  timestamp: number;
}

export type DecryptedMessage = Messages & {
  decryptedMessage: string;
}

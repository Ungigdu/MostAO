export enum MostAoActions {
  QueryHandle = "QueryHandle",
  GetProfile = "GetProfile",
  EstablishSession = "EstablishSession",
}

export type HandleType = {
  owner: string;
  pid: string;
  handleName: string;
};

export type ProfileType = {
  bio?: string;
  name?: string;
  pubkey: string;
};

export type HandleProfileType = HandleType & ProfileType;

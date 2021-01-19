import {AgentSession} from "../utils/session";
import {IAppEnvironments} from "env-enums";
import {readFile} from "../utils/files";

export default async function setAppEnvs(envs: IAppEnvironments) {
  await readFile(envs.AUTH_KEYS_PATH.PUBLIC).then((publicKey: string) => {
    AgentSession.setEnvs({
      publicKey: publicKey
        .replace('-----BEGIN RSA PUBLIC KEY-----\n', '')
        .replace('-----END RSA PUBLIC KEY-----\n', '')
        .replace('\n', '')
    })
  });
  await readFile(envs.AUTH_KEYS_PATH.PRIVATE).then((privateKey: string) => {
    AgentSession.setEnvs({
      privateKey: privateKey
        .replace('-----BEGIN RSA PRIVATE KEY-----\n', '')
        .replace('-----END RSA PRIVATE KEY-----\n', '')
        .replace('\n', '')
    })
  });
}
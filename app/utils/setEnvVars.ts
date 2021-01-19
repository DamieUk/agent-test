import {execute} from './execute';
import {OS_TYPE} from "os-enums";
import {IDynamicEnvVars} from "env-enums";
import logger from "./logger";

interface IEnvVars {
  VM_TOOLS_UTILS: string;
}

type IOSVars = {
  [key in OS_TYPE]: IEnvVars;
};

const VARS: IOSVars = {
  WINDOWS: {
    VM_TOOLS_UTILS: 'C:/Program Files/VMware/VMware Tools'
  },
  MAC: {
    VM_TOOLS_UTILS: 'set/mac/vmwaretools/path'
  },
  LINUX: {
    VM_TOOLS_UTILS: 'set/linux/vmwaretools/path'
  }
}

const ENV_VAR_NAMES_LIST = ['AGENT_TOKEN', 'API_SERVER_URL', 'SCRIPT_SERVER_URL', 'SOCKET_SERVER_URL', 'VM_ID']

export const setEnvVars = async (os: OS_TYPE): Promise<IEnvVars> => {
  switch (os) {
    case "WINDOWS":
      await execute(`SET VM_TOOLS_UTILS=${VARS[os].VM_TOOLS_UTILS}`);
      break;
    case "MAC":
      await execute(`export VM_TOOLS_UTILS=${VARS[os].VM_TOOLS_UTILS}`)
      break;
    case "LINUX":
      await execute(`export VM_TOOLS_UTILS=${VARS[os].VM_TOOLS_UTILS}`)
      break;
  }

  return VARS[os];
};

export const pullEnvVarsFromVMTools = async (vmTool: string): Promise<IDynamicEnvVars> => {
  const allEnvs: IDynamicEnvVars = {
    AGENT_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    API_SERVER_URL: 'http://jbbf-test-app-api.jbbf.ch',
    SCRIPT_SERVER_URL: null,
    SOCKET_SERVER_URL: null,
    VM_ID: null,
  };

  try {
    const xml = await execute(`${vmTool}/vmtoolsd --cmd “info-get guestinfo.ovfenv”`)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");

    xmlDoc.getElementsByTagName("Property");

    ENV_VAR_NAMES_LIST.forEach(key => {

      // @ts-ignore
      const found = [...xmlDoc.getElementsByTagName("Property")].find(node => {
        return node.attributes['oe:key'].value === key
      });

      // @ts-ignore
      allEnvs[key] = found ? found.attributes['oe:value'].value : allEnvs[key]
    });
  } catch (err) {
    logger.error('Could not get agent environment variables. Please, check if vmtoolsd service working properly or installed' , err)
  }

  return allEnvs;
}
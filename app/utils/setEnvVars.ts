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
    VM_TOOLS_UTILS: `c:\\Program Files\\VMware\\VMware Tools`
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
    AGENT_TOKEN:  null,
    API_SERVER_URL: null,
    SCRIPT_SERVER_URL: null,
    SOCKET_SERVER_URL: null,
    VM_ID: null,
  };

  try {
    logger.log(`%${vmTool}%/vmtoolsd --cmd “info-get guestinfo.ovfenv”`, `${vmTool}/vmtoolsd --cmd “info-get guestinfo.ovfenv”`)
    const xml = await execute(`%${vmTool}%/vmtoolsd --cmd “info-get guestinfo.ovfenv”`);
    logger.info('xml ->>>', xml)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    logger.log('xmlDoc ->>>', xmlDoc)

    const Properties = xmlDoc.getElementsByTagName("Property");

    ENV_VAR_NAMES_LIST.forEach(key => {

      // @ts-ignore
      const found = [...Properties].find(node => {
        return node.attributes['oe:key'].value === key
      });

      // @ts-ignore
      allEnvs[key] = found ? found.attributes['oe:value'].value : allEnvs[key]
    });
    logger.log(allEnvs);
  } catch (err) {
    logger.error('Could not get agent environment variables. Please, check if vmtoolsd service working properly or installed' , err)
  }

  return allEnvs;
}

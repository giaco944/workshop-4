import { launchOnionRouters } from "./onionRouters/launchOnionRouters";
import { launchUsers } from "./users/launchUsers";
import { launchRegistry } from "./registry/registry";


export async function launchNetwork(nbNodes: number, nbUsers: number) {
  // launch node registry
  const registry = await launchRegistry();

  // launch all nodes
  const onionServers = await launchOnionRouters(nbNodes);

  // launch all users
  const userServers = await launchUsers(nbUsers);

  return [registry, ...onionServers, ...userServers];
}

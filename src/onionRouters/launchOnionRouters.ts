import { simpleOnionRouter } from "./simpleOnionRouter"; // Importation de la fonction simpleOnionRouter pour créer un routeur oignon

// Fonction asynchrone pour lancer plusieurs routeurs oignon
export async function launchOnionRouters(n: number) {
  const promises = []; // Tableau pour stocker les promesses de création de routeurs




  // Lancement de n routeurs oignon
  for (let index = 0; index < n; index++) {
    // Création d'une promesse pour chaque routeur et ajout au tableau de promesses
    const newPromise = simpleOnionRouter(index); // Création d'un nouveau routeur oignon avec un identifiant index
    promises.push(newPromise);
  }


  
  // Attente de la résolution de toutes les promesses
  const servers = await Promise.all(promises);

  return servers; // Retourne les serveurs des routeurs oignon créés
}

// Importation des modules nécessaires
import bodyParser from "body-parser";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import express from "express";


// Importation des fonctions de chiffrement
import {
  createRandomSymmetricKey,
  symEncrypt,
  rsaEncrypt,
  exportSymKey
} from "../crypto";

// Importation des types nécessaires
import {GetNodeRegistryBody, Node} from "@/src/registry/registry";

// Définition d'une interface pour le registre des nœuds
export interface NodeRegistry {
  nodes: Node[];
}

// Définition du type pour le corps d'un message à envoyer
export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

// Fonction asynchrone pour créer un utilisateur
export async function user(userId: number) {
  // Création d'une instance de l'application Express
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Route pour vérifier le statut du serveur
  _user.get("/status/", (req, res) => {
    res.send("live");
  });

  // Initialisation des variables pour stocker les derniers messages et le dernier circuit utilisé
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit: Node[] = [];

  // Route pour recevoir un message
  _user.post("/message", (req, res) => {
    const message = req.body.message;

    lastReceivedMessage = message;

    console.log(`Received message: ${message}`);

    // Envoyer une réponse de succès
    res.status(200).send("success");
  });

  // Route pour obtenir le dernier message reçu
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // Route pour obtenir le dernier message envoyé
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // Création d'un serveur HTTP qui écoute sur un port spécifique
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  // Route pour obtenir le dernier circuit utilisé
  _user.get("/getLastCircuit", (req, res) => {
    res.status(200).json({result: lastCircuit.map((node) => node.nodeId)});
  });

  // Route pour envoyer un message
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body; // Extraction du message et de l'ID de l'utilisateur de destination

    // Récupération de la liste des nœuds depuis le registre des nœuds
    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)
        .then((res) => res.json() as Promise<GetNodeRegistryBody>)
        .then((body) => body.nodes);

    let circuit: Node[] = [];
    // Sélection aléatoire de 3 nœuds pour former un circuit
    while (circuit.length < 3) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!circuit.includes(randomNode)) {
        circuit.push(randomNode);
      }
    }

    // Préparation du message à envoyer
    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");
    let finalMessage = message;
    for(const node of circuit) {
      // Génération d'une clé symétrique aléatoire
      const symmetricKey = await createRandomSymmetricKey();
      const symmetricKey64 = await exportSymKey(symmetricKey);
      // Chiffrement du message avec la clé symétrique
      const encryptedMessage = await symEncrypt(symmetricKey, `${destination + finalMessage}`);
      destination = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, '0');
      // Chiffrement de la clé symétrique avec la clé publique du nœud
      const encryptedSymKey = await rsaEncrypt(symmetricKey64, node.pubKey);
      finalMessage = encryptedSymKey + encryptedMessage;
    }

    // Inversion du circuit pour l'ordre correct des nœuds
    circuit.reverse();
    lastCircuit = circuit; // Mise à jour du dernier circuit utilisé
    lastSentMessage = message; // Mise à jour du dernier message envoyé

    // Envoi du message au premier nœud du circuit
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: finalMessage }),
    });

    // Envoyer une réponse de succès
    res.status(200).send("success");
  });

  return server; // Retourne le serveur Express créé
}

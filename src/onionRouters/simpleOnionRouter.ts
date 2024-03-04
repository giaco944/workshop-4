import bodyParser from "body-parser";
import express from "express";
import http from "http";
import {BASE_ONION_ROUTER_PORT} from "../config";

import { REGISTRY_PORT } from "../config";
import {generateRsaKeyPair, exportPubKey, exportPrvKey, rsaDecrypt, symDecrypt} from "../crypto";



export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express(); // Création d'une instance d'Express pour le routeur oignon
  onionRouter.use(express.json()); // Utilisation du middleware intégré pour analyser les requêtes avec le format JSON
  onionRouter.use(bodyParser.json()); // Middleware pour analyser les corps des requêtes HTTP en JSON

  // Génération d'une paire de clés RSA
  const { publicKey, privateKey } = await generateRsaKeyPair();

  // Conversion de la clé privée en une chaîne base64
  let privateKeyBase64 = await exportPrvKey(privateKey);

  // Conversion de la clé publique en une chaîne base64
  let pubKeyBase64 = await exportPubKey(publicKey);

  // Enregistrement du nœud sur le registre
  const data = JSON.stringify({
    nodeId,
    pubKey: pubKeyBase64,
  });

  // Options de la requête HTTP vers le registre
  const options = {
    hostname: 'localhost',
    port: REGISTRY_PORT,
    path: '/registerNode',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  // Création de la requête HTTP
  const req = http.request(options, (res) => {
    res.on('data', (chunk) => {
      console.log(`Response: ${chunk}`);
    });
  });

  req.on('error', (error) => {
    console.error(`Problem with request: ${error.message}`);
  });

  // Envoi des données au corps de la requête
  req.write(data);
  req.end();

  // Implémentation de la route pour vérifier le statut du routeur oignon
  onionRouter.get("/status/", (req, res) => {
    res.send("live"); // Répond simplement "live" pour indiquer que le routeur est en cours d'exécution
  });

  // Déclaration de variables pour stocker les dernières informations reçues
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  // Implémentation des routes pour obtenir les dernières informations reçues et la clé privée
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKeyBase64 });
  });

  // Implémentation de la route POST pour recevoir et transférer des messages
  onionRouter.post("/message", async (req, res) => {
    const { message } = req.body; // Récupération du message du corps de la requête
    // Décryptage de la clé symétrique (début du message) avec notre clé privée
    const decryptedKey = await rsaDecrypt(message.slice(0, 344), privateKey);
    // Décryptage du reste du message avec la clé symétrique
    const decryptedMessage = await symDecrypt(decryptedKey, message.slice(344));
    // Récupération de la prochaine destination à partir du message
    const nextDestination = parseInt(decryptedMessage.slice(0, 10), 10);
    // Récupération du reste du message
    const remainingMessage = decryptedMessage.slice(10);

    // Mise à jour des dernières informations reçues
    lastReceivedEncryptedMessage = message;
    lastReceivedDecryptedMessage = remainingMessage;
    lastMessageDestination = nextDestination;

    // Envoi du message à la prochaine destination
    await fetch(`http://localhost:${nextDestination}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: remainingMessage }), // Envoi du reste du message
    });

    // Réponse indiquant le succès de la réception et du transfert du message
    res.status(200).send("success");
  });

  // Démarrage du serveur du routeur oignon
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
        `Onion router ${nodeId} is listening on port ${
            BASE_ONION_ROUTER_PORT + nodeId
        }`
    );
  });

  return server; // Retourne l'objet représentant le serveur Express pour permettre un traitement supplémentaire si nécessaire
}

// Importation des modules nécessaires
import bodyParser from "body-parser"; // Middleware pour analyser le corps des requêtes HTTP
import { REGISTRY_PORT } from "../config"; // Port d'écoute du serveur
import express, { Request, Response } from "express"; // Framework web pour Node.js

// Définition des types utilisés dans l'application
export type Node = { nodeId: number; pubKey: string }; // Représente un nœud
export type RegisterNodeBody = { // Corps d'une requête d'enregistrement de nœud
    nodeId: number;
    
    pubKey: string;
};
export type GetNodeRegistryBody = { // Corps d'une réponse contenant une liste de nœuds
    nodes: Node[];
};

// Fonction asynchrone pour lancer le serveur de registre de nœuds
export async function launchRegistry() {
    // Création de l'application Express
    const _registry = express();

    // Utilisation de middleware pour analyser les corps des requêtes
    _registry.use(express.json()); // Middleware intégré pour analyser les requêtes avec le format JSON
    _registry.use(bodyParser.json()); // Analyseur de corps JSON supplémentaire (redondant avec express.json() dans ce cas)

    // Implémentation de la route pour vérifier le statut du serveur
    _registry.get("/status", (req, res) => {
        res.send("live"); // Répond simplement "live" pour indiquer que le serveur est en cours d'exécution
    });

    // Implémentation de la route POST pour enregistrer un nouveau nœud
    let registeredNodes: Node[] = []; // Tableau pour stocker les nœuds enregistrés
    _registry.post("/registerNode", (req: Request<{}, {}, RegisterNodeBody>, res: Response) => {
        // Extraction des données de la requête pour créer un nouveau nœud
        const newNode: Node = {
            nodeId: req.body.nodeId,
            pubKey: req.body.pubKey,
        };

        registeredNodes.push(newNode); // Ajout du nouveau nœud à la liste des nœuds enregistrés

        // Réponse avec un message indiquant que le nœud a été enregistré avec succès
        res.status(200).send({ message: "Node registered successfully." });
    });

    // Implémentation de la route GET pour obtenir la liste des nœuds enregistrés
    _registry.get("/getNodeRegistry", (req, res) => {
        // Renvoie un objet JSON contenant la liste des nœuds enregistrés
        res.json({ nodes: registeredNodes });
    });

    // Démarrage du serveur Express
    const server = _registry.listen(REGISTRY_PORT, () => {
        console.log(`registry is listening on port ${REGISTRY_PORT}`); // Affichage d'un message dans la console indiquant le port d'écoute
    });

    return server; // Retourne l'objet représentant le serveur Express pour permettre un traitement supplémentaire si nécessaire
}

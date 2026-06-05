import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp({
  credential: applicationDefault(),
  projectId: cfg.projectId
});
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function test() {
    try {
        await db.collection("test").doc("conn").set({ time: Date.now() });
        console.log("Success");
    } catch(e) {
        console.error("Error:", e);
    }
}
test();

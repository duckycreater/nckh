import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(cfg);
const db = getFirestore(app, cfg.firestoreDatabaseId);
const auth = getAuth(app);

async function test() {
    try {
        const cred = await signInAnonymously(auth);
        console.log("Logged in:", cred.user.uid);
        await setDoc(doc(db, "test", "conn"), { time: Date.now() });
        console.log("Success");
    } catch(e) {
        console.error("Error:", e);
    }
}
test();

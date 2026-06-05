import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const cfg = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(cfg);
const auth = getAuth(app);

async function test() {
    try {
        const cred = await createUserWithEmailAndPassword(auth, "test@bmo-robot.com", "password123");
        console.log("Success:", cred.user.uid);
    } catch(e) {
        console.error("Error:", e);
    }
}
test();

import network
import urequests as requests
import ubinascii
import json
import os
import time
import config
import gc

DEVICE_ID = "rpi-pico-001"
CRED_FILE = "/device_credentials.json"

def get_mac():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    mac_bytes = wlan.config('mac')
    return ':'.join('%02x' % b for b in mac_bytes)

def register_device():
    mac = get_mac()
    payload = { "device_id": DEVICE_ID, "mac": mac }

    while True:
        try:
            res = requests.post(f"{config.backend_url}/devices/register", json=payload)
            if res.status_code in [200, 202]:
                print("Enregistrement accepté.")
                res.close()
                gc.collect()
                return True
            else:
                print("Réponse inattendue :", res.status_code)
                res.close()
        except Exception as e:
            print("Erreur connexion enregistrement :", e)
        gc.collect()
        print("Nouvelle tentative dans 60s...")
        time.sleep(60)

def wait_for_authorization():
    print("Attente de l'autorisation...")
    while True:
        try:
            res = requests.get(f"{config.backend_url}/devices/{DEVICE_ID}/credentials")
            data = res.json()
            if data.get("authorized") and "jwt" in data:
                print("Appareil autorisé.")
                save_credentials(data)
                res.close()
                gc.collect()
                return data
            res.close()
        except Exception as e:
            print("Erreur auth check :", e)
        gc.collect()
        time.sleep(10)

def save_credentials(data):
    with open(CRED_FILE, "w") as f:
        f.write(json.dumps(data))
        print("Token enregistré.")
    gc.collect()

def load_credentials():
    try:
        if CRED_FILE in os.listdir("/"):
            with open(CRED_FILE, "r") as f:
                data = json.loads(f.read())
                gc.collect()
                return data
    except Exception as e:
        print("Erreur lecture token :", e)
    return None

def get_token():
    creds = load_credentials()
    if not creds or "jwt" not in creds:
        if register_device():
            creds = wait_for_authorization()
    return creds.get("jwt") if creds else None

def refresh_token():
    try:
        res = requests.get(f"{config.backend_url}/devices/{DEVICE_ID}/credentials")
        data = res.json()
        if data.get("authorized"):
            save_credentials(data)
            res.close()
            gc.collect()
            print("Token mis à jour.")
            return data["jwt"]
        res.close()
    except Exception as e:
        print("Erreur refresh token :", e)
    gc.collect()
    return None


from machine import Pin, ADC
from time import sleep, time
import network
import urequests as requests
from umqtt.robust import MQTTClient
import json
import config
import auth
import gc

MQTT_PORT = 8883
MQTT_SSL_PARAMS = {"server_hostname": config.mqtt_host}
MQTT_CLIENT_ID = b"rpi-pico-001"
TOPIC = "pico/rpi-pico-001"

adc = ADC(Pin(26))
jwt = None
jwt_last_renew = 0
jwt_validity = 3600  # 1h


def initialize_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    for _ in range(10):
        if wlan.status() >= 3:
            print("Wi-Fi OK")
            return True
        print("Connexion Wi-Fi...")
        sleep(1)
    print("Nouvelle tentative de connexion Wi-Fi...")
    return False


def get_sensor_readings():
    raw_value = adc.read_u16()
    humidity = (raw_value / 65535.0) * 100
    return 25, humidity, 1013


def connect_mqtt(token):
    while True:
        try:
            client = MQTTClient(
                client_id=MQTT_CLIENT_ID,
                server=config.mqtt_server,
                port=MQTT_PORT,
                user=token,
                password="ignored",
                keepalive=60,
                ssl=True,
                ssl_params=MQTT_SSL_PARAMS
            )
            client.connect()
            print("MQTT connecté")
            return client
        except Exception as e:
            print("Erreur MQTT :", e)
            print("Nouvelle tentative de connexion MQTT...")
            sleep(5)


def is_connected(client):
    try:
        client.ping()
        return True
    except Exception as e:
        print("Déconnexion détectée :", e)
        return False


try:
    while not initialize_wifi(config.wifi_ssid, config.wifi_password):
        print("Tentative de connexion Wi-Fi...")
        sleep(5)

    jwt = auth.get_token()
    jwt_last_renew = time()
    gc.collect()

    mqtt_client = connect_mqtt(jwt)

    while True:
        # Vérification de la validité du token
        if time() - jwt_last_renew > jwt_validity:
            print("Renouvellement du token...")
            new_token = auth.refresh_token()
            if new_token:
                jwt = new_token
                jwt_last_renew = time()
                mqtt_client.disconnect()
                del mqtt_client
                gc.collect()
                mqtt_client = connect_mqtt(jwt)

        # Vérification de la connexion MQTT (robust)
        mqtt_client.reconnect()

        # Publication des données capteur
        temperature, humidity, pressure = get_sensor_readings()
        payload = json.dumps({"humidity": humidity})
        mqtt_client.publish(TOPIC, payload)
        print("Publié :", payload)
        gc.collect()
        sleep(10)

except Exception as e:
    print("Erreur fatale :", e)


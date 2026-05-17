import requests
import numpy as np

class IntegracionClimatica:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "http://api.openweathermap.org/data/2.5/weather"
        self.clases = ["riesgo_bajo", "riesgo_medio", "riesgo_alto"]

    def obtener_clima(self, lat, lon):
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric' 
        }
        try:
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            temperatura = data['main']['temp'] 
            humedad = data['main']['humidity'] 
            viento_kmh = data['wind']['speed'] * 3.6 
            
            return temperatura, humedad, viento_kmh
        except Exception as e:
            return None, None, None

    def calcular_indice_meteorologico(self, temp, humedad, viento):
        t_norm = min(max(temp / 40.0, 0), 1)
        h_norm = min(max((100 - humedad) / 100.0, 0), 1) 
        v_norm = min(max(viento / 50.0, 0), 1)
        
        peso_t = 0.35
        peso_h = 0.35
        peso_v = 0.30
        
        score = (t_norm * peso_t) + (h_norm * peso_h) + (v_norm * peso_v)
        
        probs_clima = [0.0, 0.0, 0.0]
        
        if score < 0.33:
            probs_clima = [0.7, 0.2, 0.1]
        elif score < 0.66:
            probs_clima = [0.2, 0.6, 0.2]
        else:
            probs_clima = [0.1, 0.2, 0.7]
            
        return score, np.array(probs_clima)

    def inferencia_fusionada(self, probs_cnn, probs_clima, peso_cnn=0.6, peso_clima=0.4):
        probs_finales = (probs_cnn * peso_cnn) + (probs_clima * peso_clima)
        clase_idx = int(np.argmax(probs_finales))
        return self.clases[clase_idx], probs_finales
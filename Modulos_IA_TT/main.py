import os

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import cv2
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv

from cnn_modulo import RedIncendios, obtener_imagen_aleatoria, cargar_dataset
from clima_modulo import IntegracionClimatica
import autoencoder

def evaluar_imagen_completa(ruta_img, lat, lon, modelo_cnn, modulo_clima):
    # Filtro de Contexto
    es_contexto_valido = autoencoder.verificar_contexto(ruta_img)
    if not es_contexto_valido:
        print("La imagen no pertenece al contexto.")
        return {"status": "rechazado", "mensaje": "La imagen no pertenece al contexto."}
        
    # Filtro de Riesgo Inicial (Autoencoder)
    tiene_riesgo_inicial = autoencoder.verificar_riesgo_inicial(ruta_img)
    if not tiene_riesgo_inicial:
        print("La imagen analizada no tiene Riesgo de Incendio")
        return {"status": "rechazado", "mensaje": "La imagen analizada no tiene Riesgo de Incendio"}

    # Integración Climática
    temp, hum, vien = modulo_clima.obtener_clima(lat, lon)
    if temp is None:
        print("Error obteniendo datos del clima. Usando valores por defecto.")
        temp, hum, vien = 25.0, 50.0, 10.0 
        
    score_clima, probs_clima = modulo_clima.calcular_indice_meteorologico(temp, hum, vien)
    
    # Inferencia CNN
    probs_cnn, cam = modelo_cnn.predecir_solo_visual(ruta_img)
    clase_visual = modulo_clima.clases[int(np.argmax(probs_cnn))]
    
    # Integración Final (Inferencia Final)
    clase_final, probs_finales = modulo_clima.inferencia_fusionada(probs_cnn, probs_clima, peso_cnn=0.6, peso_clima=0.4)
    
    # Cálculo de Porcentajes para mostrar
    riesgo_visual_pct = max(probs_cnn) * 100
    riesgo_climatico_pct = score_clima * 100
    riesgo_final_pct = (riesgo_visual_pct * 0.6) + (riesgo_climatico_pct * 0.4)
    
    # Generar y Guardar Imagen con Mapa de Riesgo
    target_size = 224
    img_original = cv2.imread(ruta_img)
    if img_original is None:
        print("Error: OpenCV no pudo cargar la imagen final.")
        return {"status": "error", "mensaje": "No se pudo leer la imagen original."}
        
    img_original = cv2.cvtColor(img_original, cv2.COLOR_BGR2RGB)
    img_original = cv2.resize(img_original, (target_size, target_size))
    
    heatmap = cv2.resize(cam, (target_size, target_size))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    superpuesto = cv2.addWeighted(img_original, 0.6, heatmap, 0.4, 0)
    
    ruta_salida_imagen = "mapa_riesgo_salida.png"
    cv2.imwrite(ruta_salida_imagen, cv2.cvtColor(superpuesto, cv2.COLOR_RGB2BGR))
    
    # Salida en Consola
    print("\nVariables Climaticas:")
    print(f"Temperatura: {temp:.1f} C | Humedad: {hum:.1f}% | Viento: {vien:.1f} km/h")
    print(f"Riesgo Visual: {riesgo_visual_pct:.1f}%")
    print(f"Riesgo Climatico: {riesgo_climatico_pct:.1f}%")
    print(f"Etiqueta Final: {clase_final.replace('_', ' ').title()}")
    print(f"Nivel de Riesgo Final: {riesgo_final_pct:.1f}%")
    
    # Gráfica para validación actual
    fig, ax = plt.subplots(1, 2, figsize=(10, 5))
    ax[0].imshow(img_original)
    ax[0].set_title("Imagen Original")
    ax[0].axis('off')
    ax[1].imshow(superpuesto)
    ax[1].set_title("Riesgo Visual")
    ax[1].axis('off')
    plt.suptitle("Riesgo Final")
    plt.tight_layout()
    plt.show()
    
    # Estructura de retorno
    resultado = {
        "status": "aprobado",
        "variables_climaticas": {"temperatura": temp, "humedad": hum, "viento": vien},
        "riesgo_visual_pct": riesgo_visual_pct,
        "riesgo_climatico_pct": riesgo_climatico_pct,
        "etiqueta_final": clase_final,
        "nivel_riesgo_final_pct": riesgo_final_pct,
        "ruta_imagen_generada": ruta_salida_imagen
    }
    
    return resultado

if __name__ == "__main__":
    DIR_TRAIN = r"D:\Documents\8o_semestre\TT_incendios\CNN_incendios\Dataset\train"
    DIR_TEST  = r"D:\Documents\8o_semestre\TT_incendios\CNN_incendios\Dataset\test"
    MODELO_PATH = "cnn"

    load_dotenv()
    api_key_clima = os.getenv("API_KEY_CLIMA")
    if api_key_clima:
        print("¡API Key cargada con éxito!")
    else:
        print("Error: No se pudo encontrar la API Key del archivo .env")
    API_KEY = api_key_clima

    modulo_clima = IntegracionClimatica(API_KEY)
    
    while True:
        print("\n=== MENU PRINCIPAL ===")
        print("1. Entrenar modelo desde cero")
        print("2. Cargar modelo existente")
        print("3. Salir")
        opcion = input("Seleccione una opcion: ")
        
        if opcion == '1':
            X_train, Y_train = cargar_dataset(DIR_TRAIN)
            if len(X_train) > 0:
                modelo = RedIncendios(learning_rate=0.0005)
                modelo.train(X_train, Y_train, epochs=20, batch_size=32)
                modelo.guardar_modelo(MODELO_PATH)
                
        elif opcion == '2':
            print("Cargando modelo...")
            modelo = RedIncendios()
            try:
                modelo.cargar_modelo(MODELO_PATH)
                modelos_filtros_cargados = autoencoder.cargar_modelos_locales()
                if not modelos_filtros_cargados:
                    print("Advertencia: No se encontraron modelos de filtros .h5")
                print("Modelo cargado exitosamente.")
            except Exception as e:
                print(f"Error al cargar: {e}")
                continue
                
            while True:
                print("\n=== MENU: MODELO CARGADO ===")
                print("1. Prueba individual (Imagen Aleatoria)")
                print("2. Prueba lote de imagenes con metricas (Test)")
                print("3. Prueba individual (Imagen Local)")
                print("4. Volver al menu principal")
                sub_op = input("Seleccione una opcion: ")
                
                if sub_op in ['1', '3']:
                    if sub_op == '1':
                        ruta_img, _ = obtener_imagen_aleatoria(DIR_TEST)
                    else:
                        ruta_img = input("Ingrese la ruta absoluta de la imagen: ").strip('\"\'')
                        
                    # Verificamos que la ruta exista y sea realmente un archivo (no una carpeta)
                    if ruta_img and os.path.isfile(ruta_img):
                        lat_str = input("Ingresa las coordenadas de la zona (Latitud): ")
                        lon_str = input("Ingresa las coordenadas de la zona (Longitud): ")
                        try:
                            lat = float(lat_str)
                            lon = float(lon_str)
                            datos_backend = evaluar_imagen_completa(ruta_img, lat, lon, modelo, modulo_clima)
                        except ValueError:
                            print("Coordenadas no validas.")
                    else:
                        print("Error: La ruta proporcionada no es un archivo valido o no existe.")
                        
                elif sub_op == '2':
                    print("Evaluando lote del Test Set...")
                    modelo.evaluar_y_metricas(DIR_TEST, batch_size=30, num_images=30)
                        
                elif sub_op == '4':
                    break
                    
        elif opcion == '3':
            break
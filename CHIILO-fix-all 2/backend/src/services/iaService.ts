/**
 * Simula el análisis del modelo IA FireDetection.
 *
 * ──────────────────────────────────────────────────────────────
 * PARA INTEGRAR UN MODELO REAL:
 *   Reemplaza la función `analyzeImage` para que llame a tu
 *   microservicio Python, API de ML, o modelo local (TensorFlow,
 *   ONNX, etc.) y devuelva el mismo formato de respuesta.
 * ──────────────────────────────────────────────────────────────
 */
const analyzeImage = async (_filePath: string) => {
  // Simular latencia del modelo (800-2000 ms)
  const delay = 800 + Math.floor(Math.random() * 1200);
  await new Promise((r) => setTimeout(r, delay));

  // Resultado simulado – genera valores pseudoaleatorios
  const rand = Math.random();
  const nivel = rand > 0.6 ? "alto" : rand > 0.3 ? "medio" : "bajo";

  const confianzaMap = {
    alto: 0.85 + Math.random() * 0.14,
    medio: 0.65 + Math.random() * 0.2,
    bajo: 0.9 + Math.random() * 0.09
  };
  const confianza = parseFloat(confianzaMap[nivel].toFixed(4));

  const zonas = [
    "Zona Norte – Sector A",
    "Zona Sur – Sector C",
    "Zona Este – Sector B",
    "Zona Oeste – Sector D",
    "Zona Central"
  ];
  const zona = zonas[Math.floor(Math.random() * zonas.length)];

  const temp = `${28 + Math.floor(Math.random() * 20)}°C`;
  const humedad = `${10 + Math.floor(Math.random() * 40)}%`;
  const viento = `${8 + Math.floor(Math.random() * 35)} km/h`;

  const areasMap = {
    alto: [
      "Vegetación seca detectada en sector noreste",
      "Acumulación de material combustible",
      "Humedad crítica por debajo del umbral"
    ],
    medio: [
      "Temperatura elevada en zona perimetral",
      "Humedad moderada",
      "Viento favorable para propagación"
    ],
    bajo: [
      "Vegetación con niveles normales de humedad",
      "Sin focos de calor detectados"
    ]
  };

  const afectacion = {
    alto: 20 + Math.random() * 50,
    medio: 5 + Math.random() * 20,
    bajo: 0
  }[nivel];

  return {
    nivel,
    confianza,
    zona,
    temp,
    humedad,
    viento,
    areas: areasMap[nivel],
    porcentaje_afectacion: parseFloat(afectacion.toFixed(2)),
    modelo_version: "FireDetection-v2.3",
    resultado_json: {
      nivel,
      confianza,
      zona,
      temp,
      humedad: humedad,
      viento,
      areas: areasMap[nivel]
    }
  };
};

export { analyzeImage };

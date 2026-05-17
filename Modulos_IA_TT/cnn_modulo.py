import cupy as cp
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import time
import os
import json
import random
import cv2
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, ConfusionMatrixDisplay

def resize_and_crop(image_path, target_size=224):
    img = Image.open(image_path).convert('RGB')
    w, h = img.size
    if w < h:
        new_w = target_size
        new_h = int(target_size * (h / w))
    else:
        new_h = target_size
        new_w = int(target_size * (w / h))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_size) / 2
    top = (new_h - target_size) / 2
    right = (new_w + target_size) / 2
    bottom = (new_h + target_size) / 2
    img = img.crop((left, top, right, bottom))
    img_array = np.array(img, dtype=np.float32) / 255.0
    return np.transpose(img_array, (2, 0, 1))

def cargar_dataset(base_dir, target_size=224, max_images=None):
    clases = {"riesgo_bajo": 0, "riesgo_medio": 1, "riesgo_alto": 2}
    X_data = []
    Y_data = []
    for clase, label in clases.items():
        carpeta_clase = os.path.join(base_dir, clase)
        if not os.path.exists(carpeta_clase): continue
        archivos = [f for f in os.listdir(carpeta_clase) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if max_images:
            random.shuffle(archivos)
            archivos = archivos[:max_images // 3]
        for filename in archivos:
            img_path = os.path.join(carpeta_clase, filename)
            try:
                img_array = resize_and_crop(img_path, target_size)
                X_data.append(img_array)
                y_onehot = np.zeros(3, dtype=np.float32)
                y_onehot[label] = 1.0
                Y_data.append(y_onehot)
            except Exception: pass
    return np.array(X_data), np.array(Y_data)

def obtener_imagen_aleatoria(base_dir):
    clases = ["riesgo_bajo", "riesgo_medio", "riesgo_alto"]
    clase_elegida = random.choice(clases)
    carpeta = os.path.join(base_dir, clase_elegida)
    if not os.path.exists(carpeta): return None, None
    archivos = [f for f in os.listdir(carpeta) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not archivos: return None, None
    ruta_img = os.path.join(carpeta, random.choice(archivos))
    return ruta_img, clases.index(clase_elegida)

class AdamOptimizer:
    def __init__(self, learning_rate=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8):
        self.lr = learning_rate
        self.b1 = beta1
        self.b2 = beta2
        self.eps = epsilon
        self.m = {}
        self.v = {}
        self.t = 0
        
    def update(self, layer_idx, param_name, param, grad):
        if (layer_idx, param_name) not in self.m:
            self.m[(layer_idx, param_name)] = cp.zeros_like(grad)
            self.v[(layer_idx, param_name)] = cp.zeros_like(grad)
        self.m[(layer_idx, param_name)] = self.b1 * self.m[(layer_idx, param_name)] + (1 - self.b1) * grad
        self.v[(layer_idx, param_name)] = self.b2 * self.v[(layer_idx, param_name)] + (1 - self.b2) * (grad ** 2)
        m_hat = self.m[(layer_idx, param_name)] / (1 - self.b1 ** self.t)
        v_hat = self.v[(layer_idx, param_name)] / (1 - self.b2 ** self.t)
        param -= self.lr * m_hat / (cp.sqrt(v_hat) + self.eps)
        return param

class Conv2D:
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1, padding=1):
        self.in_c = in_channels
        self.out_c = out_channels
        self.k = kernel_size
        self.s = stride
        self.p = padding
        self.name = "Conv2D"
        self.W = cp.random.randn(out_channels, in_channels, kernel_size, kernel_size, dtype=cp.float32) * cp.sqrt(2. / (in_channels * kernel_size**2))
        self.b = cp.zeros((out_channels, 1), dtype=cp.float32)
        
    def _im2col(self, X):
        N, C, H, W = X.shape
        out_h = (H + 2 * self.p - self.k) // self.s + 1
        out_w = (W + 2 * self.p - self.k) // self.s + 1
        X_pad = cp.pad(X, ((0,0), (0,0), (self.p, self.p), (self.p, self.p)), mode='constant')
        shape = (N, C, out_h, out_w, self.k, self.k)
        strides = (X_pad.strides[0], X_pad.strides[1], X_pad.strides[2]*self.s, X_pad.strides[3]*self.s, X_pad.strides[2], X_pad.strides[3])
        cols = cp.lib.stride_tricks.as_strided(X_pad, shape=shape, strides=strides)
        return cols.transpose(0, 2, 3, 1, 4, 5).reshape(N * out_h * out_w, C * self.k * self.k)

    def forward(self, input_data):
        self.X_shape = input_data.shape
        N, C, H, W = input_data.shape
        out_h = (H + 2 * self.p - self.k) // self.s + 1
        out_w = (W + 2 * self.p - self.k) // self.s + 1
        self.X_cols = self._im2col(input_data)
        W_col = self.W.reshape(self.out_c, -1)
        out = self.X_cols @ W_col.T + self.b.T
        self.out = out.reshape(N, out_h, out_w, self.out_c).transpose(0, 3, 1, 2)
        return self.out
    
    def backward(self, dout):
        N, C, H, W = self.X_shape
        out_h, out_w = dout.shape[2], dout.shape[3]
        dout_reshaped = dout.transpose(0, 2, 3, 1).reshape(-1, self.out_c)
        W_col = self.W.reshape(self.out_c, -1)
        dW = dout_reshaped.T @ self.X_cols
        dW = dW.reshape(self.W.shape)
        db = cp.sum(dout_reshaped, axis=0).reshape(-1, 1)
        dX_cols = dout_reshaped @ W_col
        dX_cols = dX_cols.reshape(N, out_h, out_w, C, self.k, self.k).transpose(0, 3, 1, 2, 4, 5)
        H_pad, W_pad = H + 2*self.p, W + 2*self.p
        dX_pad = cp.zeros((N, C, H_pad, W_pad), dtype=cp.float32)
        for i in range(self.k):
            for j in range(self.k):
                dX_pad[:, :, i:i+self.s*out_h:self.s, j:j+self.s*out_w:self.s] += dX_cols[:, :, :, :, i, j]
        if self.p > 0: dX = dX_pad[:, :, self.p:-self.p, self.p:-self.p]
        else: dX = dX_pad
        return dX, dW, db

class MaxPool2D:
    def __init__(self, pool_size=2, stride=2):
        self.p = pool_size
        self.s = stride
        self.name = "MaxPool2D"
        
    def forward(self, input_data):
        self.X_shape = input_data.shape
        N, C, H, W = input_data.shape
        out_h = (H - self.p) // self.s + 1
        out_w = (W - self.p) // self.s + 1
        shape = (N, C, out_h, out_w, self.p, self.p)
        strides = (input_data.strides[0], input_data.strides[1], input_data.strides[2]*self.s, input_data.strides[3]*self.s, input_data.strides[2], input_data.strides[3])
        self.X_strided = cp.lib.stride_tricks.as_strided(input_data, shape=shape, strides=strides)
        self.out = cp.max(self.X_strided, axis=(4, 5))
        return self.out
    
    def backward(self, dout):
        N, C, H, W = self.X_shape
        out_h, out_w = dout.shape[2], dout.shape[3]
        dX = cp.zeros(self.X_shape, dtype=cp.float32)
        out_expanded = self.out[:, :, :, :, cp.newaxis, cp.newaxis]
        mask = (self.X_strided == out_expanded)
        dout_expanded = dout[:, :, :, :, cp.newaxis, cp.newaxis]
        grad_windows = mask * dout_expanded
        for i in range(self.p):
            for j in range(self.p):
                dX[:, :, i:i+self.s*out_h:self.s, j:j+self.s*out_w:self.s] += grad_windows[:, :, :, :, i, j]
        return dX

class Dense:
    def __init__(self, input_size, output_size):
        self.W = cp.random.randn(output_size, input_size, dtype=cp.float32) * cp.sqrt(2. / input_size)
        self.b = cp.zeros((output_size, 1), dtype=cp.float32)
        self.name = "Dense"
        
    def forward(self, input_data):
        self.input = input_data
        return input_data @ self.W.T + self.b.T
    
    def backward(self, dout):
        dW = dout.T @ self.input
        db = cp.sum(dout, axis=0, keepdims=True).T
        d_input = dout @ self.W
        return d_input, dW, db

class Flatten:
    def __init__(self): self.name = "Flatten"
    def forward(self, input_data):
        self.input_shape = input_data.shape
        N = input_data.shape[0]
        return input_data.reshape(N, -1)
    def backward(self, dout): return dout.reshape(self.input_shape)

class ReLU:
    def __init__(self): self.name = "ReLU"
    def forward(self, x):
        self.x = x
        return cp.maximum(0, x)
    def backward(self, dout): return dout * (self.x > 0)

class SoftmaxCrossEntropy:
    def forward(self, logits, y_true):
        shift_logits = logits - cp.max(logits, axis=1, keepdims=True)
        exps = cp.exp(shift_logits)
        self.probs = exps / cp.sum(exps, axis=1, keepdims=True)
        probs_clipped = cp.clip(self.probs, 1e-15, 1 - 1e-15)
        loss = -cp.sum(y_true * cp.log(probs_clipped)) / logits.shape[0]
        return loss, self.probs
    def backward(self, y_true):
        return (self.probs - y_true) / y_true.shape[0]

class RedIncendios:
    def __init__(self, learning_rate=0.001):
        self.layers = [
            Conv2D(in_channels=3, out_channels=16, kernel_size=3, padding=1),
            ReLU(),
            MaxPool2D(pool_size=2, stride=2),
            Conv2D(in_channels=16, out_channels=32, kernel_size=3, padding=1),
            ReLU(),
            MaxPool2D(pool_size=2, stride=2),
            Flatten(),
            Dense(input_size=32 * 56 * 56, output_size=64),
            ReLU(),
            Dense(input_size=64, output_size=3)
        ]
        self.loss_fn = SoftmaxCrossEntropy()
        self.optimizer = AdamOptimizer(learning_rate=learning_rate)
        
    def forward_pass(self, x):
        out = x
        for layer in self.layers: out = layer.forward(out)
        return out
    
    def backward_pass(self, d_out):
        dout = d_out
        for i, layer in reversed(list(enumerate(self.layers))):
            if isinstance(layer, (Dense, Conv2D)):
                dout, dW, db = layer.backward(dout)
                layer.W = self.optimizer.update(i, 'W', layer.W, dW)
                layer.b = self.optimizer.update(i, 'b', layer.b, db)
            else: dout = layer.backward(dout)

    def train(self, X_train, Y_train, epochs, batch_size=32):
        num_samples = X_train.shape[0]
        for epoch in range(epochs):
            epoch_loss = 0
            correct_preds = 0
            indices = np.random.permutation(num_samples)
            X_shuffled = X_train[indices]
            Y_shuffled = Y_train[indices]
            for i in range(0, num_samples, batch_size):
                self.optimizer.t += 1
                X_batch_cp = cp.array(X_shuffled[i:i+batch_size])
                Y_batch_cp = cp.array(Y_shuffled[i:i+batch_size])
                logits = self.forward_pass(X_batch_cp)
                loss, probs = self.loss_fn.forward(logits, Y_batch_cp)
                epoch_loss += loss.get() * X_batch_cp.shape[0] 
                preds = cp.argmax(probs, axis=1)
                labels = cp.argmax(Y_batch_cp, axis=1)
                correct_preds += cp.sum(preds == labels).get()
                loss_grad = self.loss_fn.backward(Y_batch_cp)
                self.backward_pass(loss_grad)
                del X_batch_cp, Y_batch_cp
                cp.get_default_memory_pool().free_all_blocks()
            avg_loss = epoch_loss / num_samples
            accuracy = correct_preds / num_samples * 100
            print(f"Epoca {epoch+1}/{epochs} | Loss: {avg_loss:.4f} | Precision: {accuracy:.2f}%")
            
    def guardar_modelo(self, ruta_base="cnn"):
        arquitectura = []
        pesos = {}
        for i, layer in enumerate(self.layers):
            info = {"type": layer.name}
            if isinstance(layer, Conv2D):
                info.update({"in_channels": layer.in_c, "out_channels": layer.out_c, "kernel": layer.k, "stride": layer.s, "padding": layer.p})
                pesos[f"W_{i}"] = cp.asnumpy(layer.W)
                pesos[f"b_{i}"] = cp.asnumpy(layer.b)
            elif isinstance(layer, Dense):
                info.update({"shape": layer.W.shape})
                pesos[f"W_{i}"] = cp.asnumpy(layer.W)
                pesos[f"b_{i}"] = cp.asnumpy(layer.b)
            elif isinstance(layer, MaxPool2D):
                info.update({"pool_size": layer.p, "stride": layer.s})
            arquitectura.append(info)
        with open(f"{ruta_base}_arquitectura.json", 'w') as f: json.dump(arquitectura, f, indent=4)
        np.savez(f"{ruta_base}_pesos.npz", **pesos)

    def cargar_modelo(self, ruta_base="cnn"):
        with open(f"{ruta_base}_arquitectura.json", 'r') as f:
            arquitectura = json.load(f)
        self.layers = []
        for info in arquitectura:
            tipo = info["type"]
            if tipo == "Conv2D": self.layers.append(Conv2D(info["in_channels"], info["out_channels"], info["kernel"], info.get("stride", 1), info.get("padding", 1)))
            elif tipo == "MaxPool2D": self.layers.append(MaxPool2D(info["pool_size"], info["stride"]))
            elif tipo == "Dense": self.layers.append(Dense(info["shape"][1], info["shape"][0]))
            elif tipo == "Flatten": self.layers.append(Flatten())
            elif tipo == "ReLU": self.layers.append(ReLU())
        pesos = np.load(f"{ruta_base}_pesos.npz")
        for i, layer in enumerate(self.layers):
            if isinstance(layer, (Conv2D, Dense)):
                layer.W = cp.array(pesos[f"W_{i}"])
                layer.b = cp.array(pesos[f"b_{i}"])

    def _get_grad_cam(self, class_idx):
        dout = cp.zeros((1, 3), dtype=cp.float32)
        dout[0, class_idx] = 1.0
        cam_grads, cam_acts = None, None
        for i in reversed(range(len(self.layers))):
            layer = self.layers[i]
            if isinstance(layer, Conv2D) and cam_acts is None:
                cam_grads, cam_acts = dout.copy(), layer.out.copy()
                break
            if isinstance(layer, (Dense, Conv2D)): dout, _, _ = layer.backward(dout)
            else: dout = layer.backward(dout)
        weights = cp.mean(cam_grads[0], axis=(1, 2))
        cam = cp.zeros(cam_acts.shape[2:], dtype=cp.float32)
        for k, w in enumerate(weights): cam += w * cam_acts[0, k]
        cam = cp.maximum(cam, 0)
        if cp.max(cam) > 0: cam = cam / cp.max(cam)
        return cp.asnumpy(cam)

    def evaluar_y_metricas(self, dir_test, batch_size=32, num_images=None):
        X_test, Y_test = cargar_dataset(dir_test, target_size=224, max_images=num_images)
        if len(X_test) == 0:
            print("No se encontraron imágenes en la ruta.")
            return
        y_trues, y_preds = [], []
        for i in range(0, len(X_test), batch_size):
            X_batch = cp.array(X_test[i:i+batch_size])
            logits = self.forward_pass(X_batch)
            y_preds.extend(cp.asnumpy(cp.argmax(logits, axis=1)).tolist())
            y_trues.extend(np.argmax(Y_test[i:i+batch_size], axis=1).tolist())
            del X_batch
            cp.get_default_memory_pool().free_all_blocks()
        
        acc = accuracy_score(y_trues, y_preds)
        prec = precision_score(y_trues, y_preds, average='macro', zero_division=0)
        rec = recall_score(y_trues, y_preds, average='macro', zero_division=0)
        f1 = f1_score(y_trues, y_preds, average='macro', zero_division=0)
        
        print(f"\nResultados de Evaluación ({len(X_test)} Imágenes):")
        print(f"Accuracy:  {acc*100:.2f}%")
        print(f"Precision: {prec*100:.2f}%")
        print(f"Recall:    {rec*100:.2f}%")
        print(f"F1-Score:  {f1*100:.2f}%")
        
        cm = confusion_matrix(y_trues, y_preds)
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["Bajo", "Medio", "Alto"])
        disp.plot(cmap=plt.cm.Oranges)
        plt.title("Matriz de Confusion")
        plt.show()

    def predecir_solo_visual(self, image_path, target_size=224):
        img_array_np = resize_and_crop(image_path, target_size)
        img_array_cp = cp.array([img_array_np])
        logits = self.forward_pass(img_array_cp)
        exps = cp.exp(logits - cp.max(logits, axis=1, keepdims=True))
        probs = exps / cp.sum(exps, axis=1, keepdims=True)
        probs_np = cp.asnumpy(probs)[0]
        clase_idx = int(np.argmax(probs_np))
        cam = self._get_grad_cam(clase_idx)
        return probs_np, cam
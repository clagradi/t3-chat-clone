# 🚀 DEPLOY SU RENDER - GUIDA COMPLETA

## 📋 **PREPARAZIONE COMPLETATA:**
✅ Configurazione API URL dinamica nel frontend
✅ Configurazione database PostgreSQL per production
✅ File render.yaml per deploy automatico
✅ Requirements.txt con tutte le dipendenze
✅ Script di build ottimizzato

## 🌐 **PASSI PER DEPLOY SU RENDER:**

### **1. CARICA SU GITHUB**
1. Estrai il file `t3-chat-clone-render.zip`
2. Carica tutto il contenuto nel tuo repository GitHub
3. Assicurati che tutti i file siano nella root del repository

### **2. DEPLOY SU RENDER**
1. Vai su **render.com** → Sign up/Login con GitHub
2. Clicca **"New"** → **"Web Service"**
3. **Connect** il tuo repository GitHub
4. **Configurazione:**
   - **Name**: `t3-chat-clone`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r t3-chat-api/requirements.txt`
   - **Start Command**: `cd t3-chat-api && gunicorn --bind 0.0.0.0:$PORT src.main:app`
   - **Instance Type**: `Free`

### **3. AGGIUNGI DATABASE**
1. Nel dashboard Render, clicca **"New"** → **"PostgreSQL"**
2. **Name**: `t3-chat-db`
3. **Database Name**: `t3_chat`
4. **User**: `t3_user`
5. **Plan**: `Free`

### **4. COLLEGA DATABASE AL WEB SERVICE**
1. Vai nelle **Environment Variables** del tuo web service
2. Aggiungi:
   - **DATABASE_URL**: (copia dalla dashboard PostgreSQL)
   - **JWT_SECRET_KEY**: (genera una stringa random)

### **5. DEPLOY FRONTEND**
1. Clicca **"New"** → **"Static Site"**
2. **Connect** lo stesso repository
3. **Configurazione:**
   - **Name**: `t3-chat-frontend`
   - **Build Command**: `cd t3-chat-clone && npm install && npm run build`
   - **Publish Directory**: `t3-chat-clone/dist`
4. **Environment Variables**:
   - **VITE_API_URL**: `https://t3-chat-clone.onrender.com` (URL del tuo web service)

## ✅ **RISULTATO FINALE:**
- **Backend API**: `https://t3-chat-clone.onrender.com`
- **Frontend**: `https://t3-chat-frontend.onrender.com`
- **Database**: PostgreSQL gestito da Render

**Il tuo clone t3.chat sarà live e accessibile pubblicamente! 🎉**


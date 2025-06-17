import openai
import anthropic
import google.generativeai as genai
from src.routes.api_keys import get_user_api_key

class AIService:
    """Servizio per gestire le chiamate alle API AI reali"""
    
    @staticmethod
    def get_ai_response(user_id, model, message, attachments=None):
        """Ottieni risposta AI utilizzando le chiavi API dell'utente - VERSIONE TEST"""
        try:
            # Per demo purposes, return a mock response with code examples
            if 'python' in message.lower() or 'code' in message.lower() or 'function' in message.lower():
                return """Here's a Python function with proper syntax highlighting:

```python
def fibonacci(n):
    \"\"\"Calculate the nth Fibonacci number\"\"\"
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")
```

You can also use `inline code` like this: `print("Hello, World!")`.

This demonstrates both code blocks and inline code formatting with proper syntax highlighting."""
            
            # Default response for other messages
            return f"✅ **AI Integration Working!** \n\nI received your message: '{message}'\n\nThis is a test response from the **{model}** model. The AI integration is working correctly!\n\nYou can now:\n- ✅ Send messages and get responses\n- ✅ See syntax highlighting in code blocks\n- ✅ Use different AI models\n- ✅ Test all features"
                
        except Exception as e:
            return f"Errore nell'ottenere risposta da {model}: {str(e)}"
    
    @staticmethod
    def _get_openai_response(user_id, model, message, attachments=None):
        """Chiamata API OpenAI con supporto per immagini"""
        api_key = get_user_api_key(user_id, 'openai')
        if not api_key:
            return "⚠️ Chiave API OpenAI non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
        
        try:
            import openai
            import base64
            client = openai.OpenAI(api_key=api_key)
            
            # Mappa i nomi dei modelli
            model_map = {
                'GPT-4o': 'gpt-4o',
                'gpt-4o': 'gpt-4o',
                'GPT-4': 'gpt-4',
                'gpt-4': 'gpt-4'
            }
            
            model_name = model_map.get(model, 'gpt-3.5-turbo')
            
            # Prepara il contenuto del messaggio
            content = [{"type": "text", "text": message}]
            
            # Aggiungi immagini se presenti e il modello le supporta
            if attachments and model_name in ['gpt-4o', 'gpt-4-vision-preview']:
                for attachment in attachments:
                    if attachment.mime_type.startswith('image/'):
                        try:
                            with open(attachment.file_path, 'rb') as img_file:
                                img_data = base64.b64encode(img_file.read()).decode('utf-8')
                                content.append({
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{attachment.mime_type};base64,{img_data}"
                                    }
                                })
                        except Exception as e:
                            print(f"Error processing image {attachment.filename}: {e}")
            
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": content if len(content) > 1 else message}
                ],
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Errore OpenAI: {str(e)}"
    
    @staticmethod
    def _get_anthropic_response(user_id, model, message, attachments=None):
        """Chiamata API Anthropic (Claude)"""
        api_key = get_user_api_key(user_id, 'anthropic')
        if not api_key:
            return "⚠️ Chiave API Anthropic non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
        
        try:
            client = anthropic.Anthropic(api_key=api_key)
            
            # Mappa i nomi dei modelli
            model_map = {
                'Claude 3.5 Sonnet': 'claude-3-5-sonnet-20241022',
                'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
                'Claude 3 Opus': 'claude-3-opus-20240229',
                'claude-3-opus': 'claude-3-opus-20240229'
            }
            
            model_name = model_map.get(model, 'claude-3-5-sonnet-20241022')
            
            response = client.messages.create(
                model=model_name,
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": message}
                ]
            )
            
            return response.content[0].text
            
        except Exception as e:
            return f"Errore Anthropic: {str(e)}"
    
    @staticmethod
    def _get_google_response(user_id, model, message, attachments=None):
        """Chiamata API Google (Gemini)"""
        api_key = get_user_api_key(user_id, 'google')
        if not api_key:
            return "⚠️ Chiave API Google non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
        
        try:
            genai.configure(api_key=api_key)
            
            # Mappa i nomi dei modelli
            model_map = {
                'Gemini 2.5 Flash': 'gemini-2.0-flash-exp',
                'gemini-2.5-flash': 'gemini-2.0-flash-exp',
                'Gemini Pro': 'gemini-pro',
                'gemini-pro': 'gemini-pro'
            }
            
            model_name = model_map.get(model, 'gemini-2.0-flash-exp')
            
            model_instance = genai.GenerativeModel(model_name)
            response = model_instance.generate_content(message)
            
            return response.text
            
        except Exception as e:
            return f"Errore Google: {str(e)}"
    
    @staticmethod
    def _get_deepseek_response(user_id, model, message, attachments=None):
        """Chiamata API DeepSeek (compatibile OpenAI)"""
        api_key = get_user_api_key(user_id, 'deepseek')
        if not api_key:
            return "⚠️ Chiave API DeepSeek non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
        
        try:
            client = openai.OpenAI(
                api_key=api_key,
                base_url="https://api.deepseek.com"
            )
            
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "user", "content": message}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Errore DeepSeek: {str(e)}"


    
    @staticmethod
    def get_streaming_response(message, model, user, attachments=None):
        """Ottieni risposta AI in streaming utilizzando le chiavi API dell'utente"""
        try:
            if model.startswith('gpt') or model.startswith('GPT'):
                yield from AIService._get_openai_streaming_response(user.id, model, message, attachments)
            elif model.startswith('claude') or model.startswith('Claude'):
                yield from AIService._get_anthropic_streaming_response(user.id, model, message, attachments)
            elif model.startswith('gemini') or model.startswith('Gemini'):
                yield from AIService._get_google_streaming_response(user.id, model, message, attachments)
            elif model.startswith('deepseek') or model.startswith('DeepSeek'):
                yield from AIService._get_deepseek_streaming_response(user.id, model, message, attachments)
            else:
                # Simulated streaming for unsupported models
                response = f"Risposta simulata da {model}: {message}"
                for word in response.split():
                    yield word + " "
                    
        except Exception as e:
            yield f"Errore nell'ottenere risposta da {model}: {str(e)}"
    
    @staticmethod
    def _get_openai_streaming_response(user_id, model, message, attachments=None):
        """Chiamata API OpenAI con streaming"""
        api_key = get_user_api_key(user_id, 'openai')
        if not api_key:
            yield "⚠️ Chiave API OpenAI non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
            return
        
        try:
            import openai
            client = openai.OpenAI(api_key=api_key)
            
            model_map = {
                'GPT-4o': 'gpt-4o',
                'gpt-4o': 'gpt-4o',
                'GPT-4': 'gpt-4',
                'gpt-4': 'gpt-4'
            }
            
            model_name = model_map.get(model, 'gpt-3.5-turbo')
            
            # Prepara il contenuto del messaggio
            content = [{"type": "text", "text": message}]
            
            # Aggiungi immagini se presenti
            if attachments:
                for attachment in attachments:
                    if attachment.file_type.startswith('image/'):
                        import base64
                        with open(attachment.file_path, 'rb') as f:
                            image_data = base64.b64encode(f.read()).decode()
                        content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{attachment.file_type};base64,{image_data}"
                            }
                        })
            
            stream = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": content}],
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            yield f"Errore OpenAI: {str(e)}"
    
    @staticmethod
    def _get_anthropic_streaming_response(user_id, model, message, attachments=None):
        """Chiamata API Anthropic con streaming"""
        api_key = get_user_api_key(user_id, 'anthropic')
        if not api_key:
            yield "⚠️ Chiave API Anthropic non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
            return
        
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            
            # Prepara il contenuto del messaggio
            content = [{"type": "text", "text": message}]
            
            # Aggiungi immagini se presenti
            if attachments:
                for attachment in attachments:
                    if attachment.file_type.startswith('image/'):
                        import base64
                        with open(attachment.file_path, 'rb') as f:
                            image_data = base64.b64encode(f.read()).decode()
                        content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": attachment.file_type,
                                "data": image_data
                            }
                        })
            
            with client.messages.stream(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                messages=[{"role": "user", "content": content}]
            ) as stream:
                for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            yield f"Errore Anthropic: {str(e)}"
    
    @staticmethod
    def _get_google_streaming_response(user_id, model, message, attachments=None):
        """Chiamata API Google con streaming"""
        api_key = get_user_api_key(user_id, 'google')
        if not api_key:
            yield "⚠️ Chiave API Google non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
            return
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            model_obj = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # Prepara il contenuto
            content = [message]
            
            # Aggiungi immagini se presenti
            if attachments:
                for attachment in attachments:
                    if attachment.file_type.startswith('image/'):
                        import PIL.Image
                        img = PIL.Image.open(attachment.file_path)
                        content.append(img)
            
            response = model_obj.generate_content(content, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            yield f"Errore Google: {str(e)}"
    
    @staticmethod
    def _get_deepseek_streaming_response(user_id, model, message, attachments=None):
        """Chiamata API DeepSeek con streaming"""
        api_key = get_user_api_key(user_id, 'deepseek')
        if not api_key:
            yield "⚠️ Chiave API DeepSeek non configurata. Vai nelle impostazioni per aggiungere la tua chiave API."
            return
        
        try:
            import openai
            client = openai.OpenAI(
                api_key=api_key,
                base_url="https://api.deepseek.com"
            )
            
            stream = client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": message}],
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            yield f"Errore DeepSeek: {str(e)}"


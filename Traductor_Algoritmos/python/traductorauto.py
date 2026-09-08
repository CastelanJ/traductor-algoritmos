import tkinter as tk
from tkinter import messagebox

# ---------------- FUNCIONES ----------------

# Prioridad de los operadores
def prioridad(op):
    if op == '^':
        return 3
    elif op in '*/':
        return 2
    elif op in '+-':
        return 1
    else:
        return 0

# Función para separar la expresión correctamente
def tokenizar(expresion):
    tokens = []
    actual = ''
    for char in expresion:
        if char.isalnum():  # Si es letra o número
            actual += char
        else:
            if actual:
                tokens.append(actual)
                actual = ''
            if char in '+-*/^()':
                tokens.append(char)
            elif char.isspace():
                continue
            else:
                raise ValueError(f"Caracter inválido: '{char}'")
    if actual:
        tokens.append(actual)
    return tokens

# Función para convertir infijo a postfijo
def infijo_a_postfijo(expresion):
    try:
        salida = []
        pila = []
        tokens = tokenizar(expresion)

        for token in tokens:
            if token.isalnum():
                salida.append(token)
            elif token == '(':
                pila.append(token)
            elif token == ')':
                while pila and pila[-1] != '(':
                    salida.append(pila.pop())
                if pila:
                    pila.pop()
                else:
                    return "Error: Paréntesis desbalanceados"
            elif token in "+-*/^":
                while pila and (
                    (prioridad(pila[-1]) > prioridad(token)) or
                    (prioridad(pila[-1]) == prioridad(token) and token != '^')
                ):
                    salida.append(pila.pop())
                pila.append(token)
            else:
                return f"Error: Token no reconocido '{token}'"

        while pila:
            if pila[-1] == '(':
                return "Error: Paréntesis desbalanceados"
            salida.append(pila.pop())

        return ' '.join(salida)
    
    except ValueError as e:
        return str(e)

# Función para convertir infijo a prefijo
def infijo_a_prefijo(expresion):
    try:
        tokens = tokenizar(expresion)
        tokens.reverse()
        for i in range(len(tokens)):
            if tokens[i] == '(':
                tokens[i] = ')'
            elif tokens[i] == ')':
                tokens[i] = '('
        invertida = ' '.join(tokens)
        postfija = infijo_a_postfijo(invertida)
        if postfija.startswith("Error"):
            return postfija
        return ' '.join(postfija.split()[::-1])
    except Exception as e:
        return f"Error: {str(e)}"

# Función para convertir postfijo a infijo
def postfijo_a_infijo(expresion):
    try:
        tokens = expresion.split()
        stack = []
        for token in tokens:
            if token.isalnum():
                stack.append(token)
            else:
                op2 = stack.pop()
                op1 = stack.pop()
                stack.append(f"( {op1} {token} {op2} )")
        return stack[-1]
    except:
        return "Error en expresión postfija."

# Función para convertir prefijo a infijo
def prefijo_a_infijo(expresion):
    try:
        tokens = expresion.split()[::-1]
        stack = []
        for token in tokens:
            if token.isalnum():
                stack.append(token)
            else:
                op1 = stack.pop()
                op2 = stack.pop()
                stack.append(f"( {op1} {token} {op2} )")
        return stack[-1]
    except:
        return "Error en expresión prefija."

# Función para convertir prefijo a postfijo
def prefijo_a_postfijo(expresion):
    infijo = prefijo_a_infijo(expresion)
    if infijo.startswith("Error"):
        return infijo
    return infijo_a_postfijo(infijo)

# Función para convertir postfijo a prefijo
def postfijo_a_prefijo(expresion):
    infijo = postfijo_a_infijo(expresion)
    if infijo.startswith("Error"):
        return infijo
    return infijo_a_prefijo(infijo)

# Función que llama a la conversión
def convertir():
    expresion = entrada.get()
    if not expresion.strip():
        messagebox.showwarning("Advertencia", "Por favor ingresa una expresión.")
        return
    
    opcion = conversion_var.get()
    if opcion == "Infija a Postfija":
        resultado = infijo_a_postfijo(expresion)
    elif opcion == "Infija a Prefija":
        resultado = infijo_a_prefijo(expresion)
    elif opcion == "Prefija a Infija":
        resultado = prefijo_a_infijo(expresion)
    elif opcion == "Prefija a Postfija":
        resultado = prefijo_a_postfijo(expresion)
    elif opcion == "Postfija a Infija":
        resultado = postfijo_a_infijo(expresion)
    elif opcion == "Postfija a Prefija":
        resultado = postfijo_a_prefijo(expresion)
    else:
        resultado = "Conversión no válida."
    
    salida_var.set(resultado)

# ---------------- PANTALLA PRINCIPAL ----------------

def abrir_ventana_principal():
    login_window.destroy()

    ventana = tk.Tk()
    ventana.title("🎯 Traductor de Expresiones")
    ventana.geometry("550x450")
    ventana.resizable(False, False)

    colores_pastel = ["#e0f7fa", "#b2ebf2", "#80deea", "#4dd0e1", "#26c6da", 
                      "#00bcd4", "#00acc1", "#0097a7", "#00838f", "#006064", 
                      "#b2dfdb", "#a7ffeb", "#64ffda", "#1de9b6", "#00bfa5", "#a7ffeb"]

    for i, color in enumerate(colores_pastel):
        tk.Frame(ventana, bg=color, height=20, width=600).place(x=0, y=i * 20)

    frame = tk.Frame(ventana, bg="white", bd=2, relief="groove")
    frame.place(relx=0.5, rely=0.5, anchor="center", width=450, height=350)

    tk.Label(frame, text="📘 Traductor de Expresiones", 
             font=("Helvetica", 14, "bold"), bg="white", fg="#00796b").pack(pady=10)
    tk.Label(frame, text="💡 Ingresa la expresión:", font=("Helvetica", 11), bg="white").pack()

    global entrada, salida_var
    entrada = tk.Entry(frame, width=50, font=("Consolas", 12))
    entrada.pack(pady=8)

    tk.Label(frame, text="Selecciona tipo de conversión:", font=("Helvetica", 11), bg="white").pack()
    global conversion_var
    conversion_var = tk.StringVar()
    conversion_var.set("Infija a Postfija")
    opciones = [
        "Infija a Postfija",
        "Infija a Prefija",
        "Prefija a Infija",
        "Prefija a Postfija",
        "Postfija a Infija",
        "Postfija a Prefija"
    ]
    tk.OptionMenu(frame, conversion_var, *opciones).pack(pady=5)

    global boton_convertir
    boton_convertir = tk.Button(frame, text="🔁 Convertir", command=convertir,
                                bg="#00796b", fg="white", font=("Helvetica", 12, "bold"), width=25, height=1)
    boton_convertir.pack(pady=12)

    boton_convertir.bind("<Enter>", lambda e: boton_convertir.config(bg="#009688"))
    boton_convertir.bind("<Leave>", lambda e: boton_convertir.config(bg="#00796b"))

    tk.Label(frame, text="📤 Resultado:", font=("Helvetica", 11), bg="white").pack()
    salida_var = tk.StringVar()
    tk.Entry(frame, textvariable=salida_var, width=50, font=("Consolas", 12),
             state="readonly", justify="center").pack(pady=5)

    tk.Label(ventana, text="Lenguajes y Autómatas I – Proyecto Final 💻", 
             font=("Arial", 9, "italic"), bg="#c8e6c9").pack(side="bottom", fill="x")

    ventana.mainloop()

# ---------------- LOGIN FALSO ----------------

def verificar_login():
    abrir_ventana_principal()

login_window = tk.Tk()
login_window.title("🔐 Inicio de Sesión")
login_window.geometry("400x300")
login_window.configure(bg="#e3f2fd")
login_window.resizable(False, False)

tk.Label(login_window, text="Bienvenido al Traductor", font=("Helvetica", 16, "bold"),
         bg="#e3f2fd", fg="#0d47a1").pack(pady=20)

frame_login = tk.Frame(login_window, bg="white", bd=2, relief="ridge")
frame_login.place(relx=0.5, rely=0.5, anchor="center", width=300, height=180)

tk.Label(frame_login, text="Usuario", bg="white").place(x=30, y=20)
usuario_entry = tk.Entry(frame_login, width=25)
usuario_entry.place(x=100, y=20)

tk.Label(frame_login, text="Contraseña", bg="white").place(x=30, y=60)
contrasena_entry = tk.Entry(frame_login, show="*", width=25)
contrasena_entry.place(x=100, y=60)

btn_login = tk.Button(frame_login, text="Iniciar sesión", command=verificar_login,
                      bg="#0d47a1", fg="white", font=("Helvetica", 10, "bold"))
btn_login.place(relx=0.5, rely=0.8, anchor="center")

login_window.mainloop()
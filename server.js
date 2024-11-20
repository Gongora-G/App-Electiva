require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

// Configuración de body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configura archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'freshshop-master')));

// Configura el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesiones
app.use(session({
    secret: 'korean_wave_secret',
    resave: false,
    saveUninitialized: true,
}));

// Conexión a la base de datos MySQL usando un pool de conexiones
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL, // URL de la base de datos en Railway
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
}).promise(); // Usamos promise para soportar async/await

// Middleware para definir `user` en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Ruta para la página principal
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

// Ruta para manejar el formulario de contacto
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    const query = 'INSERT INTO contact_form (name, email, subject, message) VALUES (?, ?, ?, ?)';

    try {
        await pool.query(query, [name, email, subject, message]);
        res.send('Mensaje enviado correctamente.');
    } catch (err) {
        console.error('Error al insertar los datos:', err);
        res.status(500).send('Error al guardar el mensaje.');
    }
});

// Ruta para manejar registro de usuarios
app.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length > 0) {
            return res.render('register', { errorMessage: 'El correo electrónico ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)';
        await pool.query(query, [nombre, email, hashedPassword]);

        res.redirect('/login');
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.render('register', { errorMessage: 'Hubo un error al registrar el usuario.' });
    }
});

// Ruta para inicio de sesión
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.user = { id: user.id, nombre: user.nombre, email: user.email };
                return res.redirect('/');
            } else {
                return res.render('login', { errorMessage: 'Contraseña incorrecta.' });
            }
        } else {
            return res.render('login', { errorMessage: 'Usuario no encontrado.' });
        }
    } catch (err) {
        console.error('Error al buscar el usuario:', err);
        res.render('login', { errorMessage: 'Error en el servidor. Por favor, inténtalo más tarde.' });
    }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.redirect('/');
    });
});

// Ruta para mostrar el carrito
app.get('/cart', (req, res) => {
    res.render('cart', { cart: req.session.cart || [], user: req.session.user || null });
});

// Ruta para añadir productos al carrito
app.post('/add-to-cart', (req, res) => {
    const { id, name, price } = req.body;

    const product = { id, name, price };

    if (!req.session.cart) {
        req.session.cart = [];
    }
    req.session.cart.push(product);

    res.redirect('/cart');
});

// Ruta para vaciar el carrito
app.post('/clear-cart', (req, res) => {
    req.session.cart = [];
    res.json({ success: true });
});

// Ruta para registrar productos en la tienda
app.get('/shop', (req, res) => {
    const products = [
        { id: 1, name: "Producto 1", price: 9.99, image: "images/img-pro-01.jpg" },
        { id: 2, name: "Producto 2", price: 14.99, image: "images/img-pro-02.jpg" },
        { id: 3, name: "Producto 3", price: 7.99, image: "images/img-pro-03.jpg" },
    ];
    res.render('shop', { products, cart: req.session.cart || [] });
});

// Ruta para la página de detalles de producto
app.get('/shop-detail', (req, res) => {
    res.render('shop-detail', { user: req.session.user || null });
});

// Ruta para la página de "Sobre Nosotros"
app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

// Ruta para la galería
app.get('/gallery', (req, res) => {
    res.render('gallery', { user: req.session.user || null });
});

// Ruta para la página de contacto
app.get('/contact-us', (req, res) => {
    res.render('contact-us', { user: req.session.user || null });
});

// Servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});

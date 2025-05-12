from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://localhost/quiz_maker')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')

# Initialize database
db = SQLAlchemy(app)

# Import routes after app initialization to avoid circular imports
from app.routes import pdf_routes, quiz_routes, user_routes

# Register blueprints
app.register_blueprint(pdf_routes.bp)
app.register_blueprint(quiz_routes.bp)
app.register_blueprint(user_routes.bp)

if __name__ == '__main__':
    app.run(debug=True, port=8001) 
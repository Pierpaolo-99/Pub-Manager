import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./register.css";

export default function Register() {

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const registerUrl = "http://localhost:3000/api/users/register";

    const initialForm = {
        name: "",
        role: "",
        email: "",
        password: ""
    };

    const [form, setForm] = useState(initialForm);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form submitted:", form);

        const result = await register(form);
        
        if (result.success) {
            navigate('/admin');
        } else {
            alert(result.message || 'Registration failed');
        }
        
        setForm(initialForm);
    }

    return (
        <>
            <div className="register-container">
                <div className="register-card">
                    <h1 className="register-title">Register</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name" className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-input"
                                id="name"
                                name="name"
                                placeholder="Enter your name"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>                        
                        <div className="form-group">
                            <label htmlFor="role" className="form-label">Role</label>
                            <input
                                type="text"
                                className="form-input"
                                id="role"
                                name="role"
                                placeholder="Enter your role"
                                value={form.role}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email address</label>
                            <input
                                type="email"
                                className="form-input"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                            />
                        </div>
                        <button type="submit" className="btn-primary">Register</button>
                    </form>
                    <div className="login-link">
                        <Link to={'/login'} className="link">Already have an account? Login</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
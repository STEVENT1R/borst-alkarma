import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في الاتصال');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-green-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-green-100">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-full mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">بورصة الكرمه</h1>
          <p className="text-gray-500 text-sm">تسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <input
              className="w-full p-3 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <input
              type="password"
              className="w-full p-3 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            دخول
          </button>
        </form>

        <p className="mt-6 text-center text-gray-500 text-sm">
          بورصة الكرمه
        </p>
      </div>
    </div>
  );
};

export default Login;
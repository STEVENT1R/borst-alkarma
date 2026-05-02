@echo off
echo ============================================
echo   Borst Alkarma - Supabase Database Setup
echo ============================================
echo.
echo هذا السكريبت بينشئ الجداول في Supabase
echo.

REM اسأل المستخدم عن رابط قاعدة البيانات
set /p DB_URL="الرجاء لصق رابط قاعدة البيانات من Supabase (Connection String): "

echo.
echo جاري الاتصال بقاعدة البيانات وإنشاء الجداول...
echo.

REM تشغيل initDb.js مع رابط Supabase
set DATABASE_URL=%DB_URL%
node src/config/initDb.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo   تم بنجاح! قاعدة البيانات جاهزة ✅
    echo.
    echo   بيانات الدخول: admin / admin
    echo ============================================
) else (
    echo.
    echo ============================================
    echo   حدث خطأ ❌
    echo   تأكد من صحة رابط قاعدة البيانات
    echo ============================================
)

pause

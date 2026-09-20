# PKTY Thanh Liêm - bản triển khai Railway

## Chạy local
1. Cài Node.js 18+.
2. Chạy `npm install`.
3. Chạy `npm start`.
4. Mở http://localhost:3000
5. Quản trị: http://localhost:3000/admin/

## Railway
Railway sẽ tự nhận `package.json` và chạy `npm start`.
Nên đặt các biến môi trường:
- ADMIN_USER
- ADMIN_PASS
- SESSION_SECRET
- NODE_ENV=production

Không commit file `.env`.

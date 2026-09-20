# Website PHÒNG KHÁM THÚ Y PKTY THANH LIÊM — bản quản trị online

## Chạy thử
1. Cài Node.js.
2. Mở terminal tại thư mục này.
3. Chạy `npm install`
4. Chạy `npm start`
5. Mở `http://localhost:3000`
6. Trang quản trị: `http://localhost:3000/admin/`

## Tài khoản mặc định
- Username: admin
- Password: thanhliem2026

Khi đưa lên hosting thật, nên đổi bằng biến môi trường:
ADMIN_USER, ADMIN_PASS, SESSION_SECRET.

Dữ liệu quản trị được lưu trong `data/site.json`.


## Lịch hẹn
Website có API `/api/appointments`. Khách gửi form đặt lịch sẽ được lưu vào `data/appointments.json`. Admin xem tại `/admin/`, tab **Lịch hẹn**, đổi trạng thái hoặc xóa lịch.


## Thông báo & hình ảnh
- Admin có tab Hình ảnh để upload ảnh lên server.
- Admin có tab Thông báo để cấu hình webhook. Khi có lịch mới, server gửi payload đến webhook.
- Không nên đặt webhook/secret công khai trong mã nguồn; cấu hình trong admin sau khi đăng nhập.


## Dashboard
Trang quản trị có dashboard tổng quan: lịch hôm nay, lịch mới, lịch đã xác nhận, tổng lịch hẹn và danh sách lịch sắp tới; có nút gọi/Zalo nhanh.

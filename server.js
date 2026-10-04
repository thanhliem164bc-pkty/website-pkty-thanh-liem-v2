const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "thanhliem2026";

const publicDir = __dirname;

const dbDir = path.join(__dirname, "data");
const dbFile = path.join(dbDir, "site.json");
const appointmentsFile = path.join(dbDir, "appointments.json");

const uploadsDir = path.join(__dirname, "uploads");
const galleryDir = path.join(uploadsDir, "gallery");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

if (!fs.existsSync(appointmentsFile)) {
  fs.writeFileSync(appointmentsFile, "[]");
}

/* =========================
   MULTER
========================= */

const upload = multer({
  dest: uploadsDir
});

/* =========================
   DEFAULT WEBSITE DATA
========================= */

const defaults = {
  name: "PHÒNG KHÁM THÚ Y PKTY THANH LIÊM",

  phone: "0938 848 238",

  zalo: "https://zalo.me/0938848238",

  facebook:
    "https://www.facebook.com/profile.php?id=61593452407647&locale=vi_VN",

  address: "128 Lê Thị Hà, Xã Hóc Môn, TP.HCM",

  maps:
    "https://maps.app.goo.gl/1pYxKcbj68PE8qyX8",

  heroTitle:
    "Người bạn nhỏ, luôn được yêu thương.",

  heroText: "",

  about: "",

  bookingText: "",

  services: [
    "Điều trị thú cưng",
    "Tiêm phòng",
    "Spa thú cưng",
    "Petshop"
  ],

  spa: [],

  notifyWebhook: "",

  notifyEnabled: false
};

/* =========================
   DATABASE
========================= */

function readDB() {
  try {
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(
        dbFile,
        JSON.stringify(defaults, null, 2)
      );

      return { ...defaults };
    }

    const data = JSON.parse(
      fs.readFileSync(dbFile, "utf8")
    );

    return {
      ...defaults,
      ...data
    };
  } catch (error) {
    console.error("READ DB ERROR:", error);

    return {
      ...defaults
    };
  }
}

function writeDB(data) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify(data, null, 2)
  );
}

/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "1mb"
  })
);

/*
  Không cache API.
  Tránh lỗi 304 làm frontend không đọc được JSON.
*/

app.use("/api", (req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );

  res.set("Pragma", "no-cache");

  res.set("Expires", "0");

  next();
});

/* =========================
   SESSION
========================= */

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "thanh-liem-change-this-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,

      sameSite: "lax",

      secure:
        process.env.NODE_ENV === "production"
    }
  })
);

/* =========================
   AUTH
========================= */

function auth(req, res, next) {
  if (
    req.session &&
    req.session.admin
  ) {
    return next();
  }

  return res.status(401).json({
    error: "Chưa đăng nhập"
  });
}

/* =========================
   WEBSITE API
========================= */

app.get("/api/site", (req, res) => {
  res.json(readDB());
});

app.post("/api/login", (req, res) => {
  const {
    username,
    password
  } = req.body || {};

  if (
    username === ADMIN_USER &&
    password === ADMIN_PASS
  ) {
    req.session.admin = true;

    return res.json({
      ok: true
    });
  }

  return res.status(401).json({
    error: "Sai tài khoản hoặc mật khẩu"
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

app.get("/api/me", (req, res) => {
  res.json({
    loggedIn:
      !!(
        req.session &&
        req.session.admin
      )
  });
});

app.put("/api/site", auth, (req, res) => {
  const data = {
    ...defaults,
    ...req.body
  };

  writeDB(data);

  res.json(data);
});

/* =========================
   APPOINTMENTS
========================= */

function readAppointments() {
  try {
    if (!fs.existsSync(appointmentsFile)) {
      return [];
    }

    const raw = fs.readFileSync(
      appointmentsFile,
      "utf8"
    );

    const data = JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];
  } catch (error) {
    console.error(
      "READ APPOINTMENTS ERROR:",
      error
    );

    return [];
  }
}

function writeAppointments(list) {
  fs.writeFileSync(
    appointmentsFile,
    JSON.stringify(list, null, 2)
  );
}

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

/* Tạo lịch hẹn */

app.post(
  "/api/appointments",
  (req, res) => {
    const body = req.body || {};

    const required = [
      "ownerName",
      "phone",
      "petName",
      "date",
      "time"
    ];

    const missing =
      required.filter(
        key =>
          !String(
            body[key] || ""
          ).trim()
      );

    if (missing.length) {
      return res.status(400).json({
        error:
          "Vui lòng điền đầy đủ thông tin đặt lịch."
      });
    }

    const appointment = {
      id: makeId(),

      ownerName:
        String(
          body.ownerName || ""
        ).trim(),

      phone:
        String(
          body.phone || ""
        ).trim(),

      petName:
        String(
          body.petName || ""
        ).trim(),

      petType:
        String(
          body.petType || ""
        ).trim(),

      service:
        String(
          body.service || ""
        ).trim(),

      date:
        String(
          body.date || ""
        ).trim(),

      time:
        String(
          body.time || ""
        ).trim(),

      note:
        String(
          body.note || ""
        ).trim(),

      status: "Mới",

      createdAt:
        new Date().toISOString()
    };

    const list =
      readAppointments();

    list.push(appointment);

    writeAppointments(list);

    /*
      Gửi webhook nếu có cấu hình.
      Lỗi webhook không làm mất lịch hẹn.
    */

    const settings = readDB();

    if (
      settings.notifyEnabled &&
      settings.notifyWebhook
    ) {
      try {
        const url = new URL(
          settings.notifyWebhook
        );

        const payload =
          JSON.stringify({
            content:
              `📅 Lịch hẹn mới tại PKTY Thanh Liêm\n` +
              `Khách: ${appointment.ownerName}\n` +
              `SĐT: ${appointment.phone}\n` +
              `Thú cưng: ${appointment.petName}\n` +
              `Ngày giờ: ${appointment.date} ${appointment.time}\n` +
              `Dịch vụ: ${
                appointment.service ||
                "Chưa chọn"
              }`
          });

        const https =
          require(
            url.protocol === "https:"
              ? "https"
              : "http"
          );

        const request =
          https.request(
            {
              hostname:
                url.hostname,

              port:
                url.port ||
                undefined,

              path:
                url.pathname +
                url.search,

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Content-Length":
                  Buffer.byteLength(
                    payload
                  )
              }
            },
            () => {}
          );

        request.on(
          "error",
          () => {}
        );

        request.write(payload);

        request.end();
      } catch (error) {}
    }

    return res
      .status(201)
      .json({
        ok: true,
        appointment
      });
  }
);

/* Danh sách lịch hẹn */

app.get(
  "/api/appointments",
  auth,
  (req, res) => {
    const list =
      readAppointments().sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

    res.json(list);
  }
);

/* Cập nhật trạng thái */

app.put(
  "/api/appointments/:id",
  auth,
  (req, res) => {
    const list =
      readAppointments();

    const item =
      list.find(
        x =>
          x.id ===
          req.params.id
      );

    if (!item) {
      return res.status(404).json({
        error:
          "Không tìm thấy lịch hẹn"
      });
    }

    if (
      req.body &&
      req.body.status
    ) {
      item.status =
        String(
          req.body.status
        );
    }

    writeAppointments(list);

    res.json(item);
  }
);

/* Xóa lịch */

app.delete(
  "/api/appointments/:id",
  auth,
  (req, res) => {
    const list =
      readAppointments();

    const next =
      list.filter(
        x =>
          x.id !==
          req.params.id
      );

    if (
      next.length ===
      list.length
    ) {
      return res.status(404).json({
        error:
          "Không tìm thấy lịch hẹn"
      });
    }

    writeAppointments(next);

    res.json({
      ok: true
    });
  }
);

/* Dashboard */

app.get(
  "/api/dashboard",
  auth,
  (req, res) => {
    const list =
      readAppointments();

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const todayCount =
      list.filter(
        x =>
          x.date === today
      ).length;

    const newCount =
      list.filter(
        x =>
          x.status === "Mới"
      ).length;

    const confirmed =
      list.filter(
        x =>
          x.status ===
          "Đã xác nhận"
      ).length;

    const upcoming =
      list
        .filter(
          x =>
            x.date &&
            x.date >= today &&
            x.status !==
              "Đã hủy"
        )
        .sort(
          (a, b) =>
            `${a.date} ${a.time}`.localeCompare(
              `${b.date} ${b.time}`
            )
        )
        .slice(0, 10);

    res.json({
      today: todayCount,

      newCount,

      confirmed,

      total: list.length,

      upcoming
    });
  }
);

/* =========================
   SETTINGS
========================= */

app.get(
  "/api/settings",
  auth,
  (req, res) => {
    const data =
      readDB();

    res.json({
      notifyWebhook:
        data.notifyWebhook ||
        "",

      notifyEnabled:
        !!data.notifyEnabled
    });
  }
);

app.put(
  "/api/settings",
  auth,
  (req, res) => {
    const data =
      readDB();

    data.notifyWebhook =
      String(
        req.body?.notifyWebhook ||
          ""
      ).trim();

    data.notifyEnabled =
      !!req.body?.notifyEnabled;

    writeDB(data);

    res.json({
      notifyWebhook:
        data.notifyWebhook,

      notifyEnabled:
        data.notifyEnabled
    });
  }
);

/* =========================
   GALLERY
========================= */

/*
  API lấy toàn bộ ảnh trong:

  uploads/gallery/

  Những ảnh cũ và ảnh mới upload
  đều tự động xuất hiện trên website.
*/

app.get(
  "/api/gallery",
  (req, res) => {
    try {
      if (
        !fs.existsSync(
          galleryDir
        )
      ) {
        fs.mkdirSync(
          galleryDir,
          {
            recursive: true
          }
        );
      }

      const files =
        fs.readdirSync(
          galleryDir
        )
        .filter(file =>
          /\.(jpg|jpeg|png|webp|gif)$/i.test(
            file
          )
        )
        .sort(
          (a, b) => {
            const fileA =
              path.join(
                galleryDir,
                a
              );

            const fileB =
              path.join(
                galleryDir,
                b
              );

            return (
              fs.statSync(
                fileB
              ).mtimeMs -
              fs.statSync(
                fileA
              ).mtimeMs
            );
          }
        );

      const result =
        files.map(
          filename => ({
            filename,

            url:
              `/uploads/gallery/${filename}`
          })
        );

      res.json(result);
    } catch (error) {
      console.error(
        "GALLERY ERROR:",
        error
      );

      res.json([]);
    }
  }
);

/*
  Upload ảnh từ Admin.

  Ảnh sẽ được lưu trực tiếp vào:

  uploads/gallery/

  Website public sẽ tự đọc
  thư mục này thông qua /api/gallery
*/

app.post(
  "/api/upload",
  auth,
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error:
            "Chưa chọn ảnh"
        });
      }

      const ext =
        path
          .extname(
            req.file
              .originalname ||
              ""
          )
          .toLowerCase();

      const safeExt =
        /^\.(jpg|jpeg|png|webp|gif)$/i.test(
          ext
        )
          ? ext
          : ".jpg";

      const filename =
        `gallery-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}${safeExt}`;

      const destination =
        path.join(
          galleryDir,
          filename
        );

      fs.renameSync(
        req.file.path,
        destination
      );

      return res.json({
        ok: true,

        filename,

        url:
          `/uploads/gallery/${filename}`
      });
    } catch (error) {
      console.error(
        "UPLOAD ERROR:",
        error
      );

      if (
        req.file &&
        req.file.path &&
        fs.existsSync(
          req.file.path
        )
      ) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch {}
      }

      return res.status(500).json({
        error:
          "Không thể tải ảnh lên"
      });
    }
  }
);

/* =========================
   STATIC FILES
========================= */

app.use(
  "/admin",
  express.static(
    path.join(
      __dirname,
      "admin"
    )
  )
);

app.use(
  express.static(
    publicDir
  )
);

/* =========================
   API 404
========================= */

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      error:
        "API không tồn tại"
    });
  }
);

/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Thanh Liem website running on port ${PORT}`
    );
  }
);

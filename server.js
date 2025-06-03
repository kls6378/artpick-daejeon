const express = require("express");
require("dotenv").config();
const db = require("oracledb");
const dbConfig = require("./config/db");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sanitizeHTML = require("sanitize-html");
const app = express();
const PORT = 80;
const sessionSecret = process.env.SESSION_SECRET;
const sanitizeOption = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: sessionSecret, // 세션을 위한 비밀 키
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1시간 후 세션 만료
  })
);
// 로그인 여부 미들웨어
app.use((req, res, next) => {
  // 세션이 활성화된 상태라면 touch() 메서드를 호출하여 만료 시간을 갱신
  if (req.session.user) {
    req.session.touch();
  }

  res.locals.user = req.session.user || null;
  next();
});

// 업로드용
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 이미지 업로드 경로 및 multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/img"));
  },
  filename: (req, file, cb) => {
    const title = req.body.title.trim();
    const ext = path.extname(file.originalname);
    cb(null, `${title}${ext}`);
  },
});

const upload = multer({ storage });

app.get("/input/upload", (req, res) => {
  res.render("input/upload");
});

app.post("/input/upload", upload.single("img"), async (req, res) => {
  const { title, description, addr, summary, link, category } = req.body;
  const imgFile = req.file;
  const img = imgFile ? imgFile.filename : null;

  // category 값에 따라 테이블명 결정
  const tableMap = {
    명소: "spot",
    맛집: "food",
    카페: "cafe",
  };

  const tableName = tableMap[category];

  if (!tableName) {
    return res.status(400).send("유효하지 않은 카테고리입니다.");
  }

  try {
    const connection = await db.getConnection(dbConfig);

    const sql = `
      INSERT INTO ${tableName} (TITLE, DESCRIPTION, IMG, ADDR, SUMMARY, LINK)
      VALUES (:title, :description, :img, :addr, :summary, :link)
    `;

    await connection.execute(
      sql,
      {
        title,
        description,
        img,
        addr,
        summary,
        link,
      },
      { autoCommit: true }
    );

    console.log(`[${tableName}] 테이블에 저장 완료:`, title);
    res.status(200).send(`[${tableName}] 테이블에 성공적으로 저장되었습니다.`);
    await connection.close();
  } catch (err) {
    console.error("DB 오류:", err);
    res.status(500).send("서버 오류");
  }
});

app.get("/", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const sql1 = `SELECT * FROM (
  SELECT id, title, img, summary
  FROM spot
  ORDER BY dbms_random.value
  )
  WHERE ROWNUM <= 3`;
  const sql2 = `SELECT * FROM (
  SELECT id, title, img, summary
  FROM food
  ORDER BY dbms_random.value
  )
  WHERE ROWNUM <= 3`;
  const sql3 = `SELECT * FROM (
  SELECT id, title, img, summary
  FROM cafe
  ORDER BY dbms_random.value
  )
  WHERE ROWNUM <= 3`;

  const result1 = await connection.execute(sql1);
  const result2 = await connection.execute(sql2);
  const result3 = await connection.execute(sql3);

  const spots = result1.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
  }));
  const foods = result2.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
  }));
  const cafes = result3.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
  }));
  res.render("index", { spots, foods, cafes });
});

app.get("/spot", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const sql = `
    SELECT 
      s.id, 
      s.title, 
      s.img, 
      s.summary, 
      s.addr,
      (SELECT COUNT(*) FROM spot_comments sc WHERE sc.detailid = s.id) AS comment_count
    FROM spot s
  `;
  const result = await connection.execute(sql);

  const spots = result.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
    addr: item[4],
    commentCount: item[5],
  }));
  res.render("spot", { spots });
});

app.get("/food", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const sql = `
    SELECT 
      f.id, 
      f.title, 
      f.img, 
      f.summary, 
      f.addr,
      (SELECT COUNT(*) FROM food_comments fc WHERE fc.detailid = f.id) AS comment_count
    FROM food f
  `;
  const result = await connection.execute(sql);

  const foods = result.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
    addr: item[4],
    commentCount: item[5],
  }));
  res.render("food", { foods });
});

app.get("/cafe", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const sql = `
    SELECT 
      c.id, 
      c.title, 
      c.img, 
      c.summary, 
      c.addr,
      (SELECT COUNT(*) FROM cafe_comments cc WHERE cc.detailid = c.id) AS comment_count
    FROM cafe c
  `;
  const result = await connection.execute(sql);

  const cafes = result.rows.map((item) => ({
    id: item[0],
    title: item[1],
    img: item[2],
    summary: item[3],
    addr: item[4],
    commentCount: item[5],
  }));
  res.render("cafe", { cafes });
});

app.get("/toon", (req,res)=>{
  res.render("toon");
})

app.get("/detail/:category/:id", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const sql1 = `SELECT id, title, description, img, addr, link FROM ${req.params.category} WHERE id = :id`;
  const sql2 = `SELECT username, text, to_char(commentdate, 'YYYY-MM-DD HH24:MI') FROM ${req.params.category}_comments WHERE detailid = :id ORDER BY commentdate ASC`;
  const sql3 = `SELECT count(*) FROM ${req.params.category}_comments WHERE detailid = :id`;
  const result1 = await connection.execute(sql1, { id: req.params.id });
  const result2 = await connection.execute(sql2, { id: req.params.id });
  const result3 = await connection.execute(sql3, { id: req.params.id });

  const location = {
    id: result1.rows[0][0],
    title: result1.rows[0][1],
    description: result1.rows[0][2],
    img: result1.rows[0][3],
    addr: result1.rows[0][4],
    link: result1.rows[0][5],
    category: req.params.category,
  };

  const comments = result2.rows.map((item) => ({
    username: item[0],
    text: item[1],
    commentdate: item[2],
  }));

  const commentCount = result3.rows[0][0];
  res.render("detail", { location, comments, commentCount });
});

app.post("/detail/:category/:id/create/comment", async (req, res) => {
  const connection = await db.getConnection(dbConfig);
  const category = req.params.category;
  const sql = `INSERT INTO ${category}_comments(username, text, detailid) VALUES (:username, :text, :detailid)`;
  const username = req.session.user.username;
  let text = sanitizeHTML(req.body.text, sanitizeOption);
  const detailid = req.params.id;
  if (!text.trim()) {
    return res.redirect(`/detail/${category}/${detailid}`);
  }
  text = text.replace(/\r\n/g, "\n");

  await connection.execute(sql, {
    username: username,
    text: text,
    detailid: detailid,
  });

  await connection.commit();
  await connection.close();

  res.redirect(`/detail/${category}/${detailid}`);
});

app.get("/company", (req, res) => {
  res.render("company");
});

// 로그인 관련
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const userId = sanitizeHTML(req.body.userId, sanitizeOption);
  const password = sanitizeHTML(req.body.password, sanitizeOption);

  const connection = await db.getConnection(dbConfig);
  const sql = `SELECT userid, password, username FROM users WHERE userid=:userid`;

  const result = await connection.execute(sql, {
    userid: userId,
  });

  if (
    result.rows.length == 0 ||
    !bcrypt.compareSync(password, result.rows[0][1])
  ) {
    return res.render("login", {
      errmsg: "아이디 또는 비밀번호가 잘못되었습니다.",
    });
  }

  if (
    result.rows[0][0] == userId &&
    bcrypt.compareSync(password, result.rows[0][1])
  ) {
    req.session.user = {
      id: userId,
      username: result.rows[0][2],
    };
  }

  res.redirect("/");
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(`에러남~: ${err}`);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const userId = sanitizeHTML(req.body.userId, sanitizeOption);
  const username = sanitizeHTML(req.body.username, sanitizeOption);
  const password = await hashPassword(req.body.password);

  if (!userId.trim() || !username.trim()) {
    return res.redirect("/register");
  }

  const connection = await db.getConnection(dbConfig);

  try {
    // 중복 체크
    const checkSql1 = `SELECT COUNT(*) AS count FROM users WHERE userid = :userid`;
    const result1 = await connection.execute(checkSql1, {
      userid: userId,
    });

    if (result1.rows[0] > 0) {
      res.render("register", {
        errmsg: "이미 존재하는 아이디입니다.",
      });
      return;
    }

    const checkSql2 = `SELECT COUNT(*) AS count FROM users WHERE username = :username`;
    const result2 = await connection.execute(checkSql2, {
      username: username,
    });

    if (result2.rows[0] > 0) {
      res.render("register", {
        errmsg: "이미 존재하는 닉네임입니다.",
      });
      return;
    }

    // 사용자 등록
    const insertSql = `INSERT INTO users (userid, username, password) VALUES (:userid, :username, :password)`;
    await connection.execute(insertSql, {
      userid: userId,
      username: username,
      password: password,
    });
    await connection.commit();

    res.redirect("/login");
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).send("서버 오류");
  } finally {
    await connection.close();
  }
});

app.use((req, res, next) => {
  res.status(404).send("없는 페이지 입니다.");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Listen on port: ${PORT}`);
});

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10); // salt는 비밀번호를 해시화할 때 추가적인 무작위 값
  const hashedPassword = await bcrypt.hash(plainPassword, salt); // 실제 비밀번호를 해시화
  return hashedPassword;
}

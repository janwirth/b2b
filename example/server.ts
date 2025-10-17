import Bun from "bun";

Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response(
      `<html>
    <body>
    <h1>Hello, world!</h1>
    </body>
    </html>`,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  },
});

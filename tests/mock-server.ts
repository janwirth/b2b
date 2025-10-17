export const serve = () =>
  Bun.serve({
    port: 3000,
    fetch: async (request) => {
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      // idle time required because otherwise it times out
      // https://github.com/puppeteer/puppeteer/issues/8383

      if (import.meta.main) {
        console.log("Serving mock server", request.url);
      }
      if (request.url.endsWith("/image-with-text.png")) {
        const content = Bun.file("./tests/image-with-text.png");
        return new Response(await content, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
          },
        });
      }
      const content = Bun.file("./tests/mock-app.html").text();
      return new Response(await content, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      });
    },
  });

if (import.meta.main) {
  serve();
}

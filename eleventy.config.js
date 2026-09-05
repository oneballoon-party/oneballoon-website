export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({"src/assets": "assets"});
  eleventyConfig.addPassthroughCopy({"src/admin": "admin"});
  eleventyConfig.addPassthroughCopy({"src/robots.txt": "robots.txt"});
  eleventyConfig.addPassthroughCopy({"src/naverce08344389b8d013968594a900727609.html": "naverce08344389b8d013968594a900727609.html"});
  eleventyConfig.addPassthroughCopy({"src/favicon-48.png": "favicon-48.png"});
  eleventyConfig.addPassthroughCopy({"src/favicon-192.png": "favicon-192.png"});
  eleventyConfig.addPassthroughCopy({"src/apple-touch-icon.png": "apple-touch-icon.png"});

  eleventyConfig.addFilter("dateKo", (dateObj) => {
    const d = new Date(dateObj);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  });

  eleventyConfig.addCollection("cases", (collectionApi) => {
    return collectionApi.getFilteredByTag("case").sort((a,b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}

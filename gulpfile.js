const { exec } = require("child_process");
const gulp = require("gulp");

const clean =  cb => exec('npx rimraf lib/ dist/', cb)
const ts = cb => exec('npx tsc', cb)
const web = cb => exec('npx webpack -p --mode production', cb)

exports.clean = clean
exports.ts = ts
exports.web = web
exports.default = gulp.series(clean, gulp.parallel(ts, web))

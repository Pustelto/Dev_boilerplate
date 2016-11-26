/*
tvorba sprites (svg i normální)
optimalizace obrázků
výměna/vkládání snippetů do html (něco jako useref, ale lepší možnosti konfigurace)
??automatické přidávání scss modulů do main.scss
maybe use gulp-rev-css-url if css images have caching issue
*/

'use strict';

import path from 'path';
import gulp from 'gulp';
import notify from 'gulp-notify';
import sass from 'gulp-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import pixrem from 'pixrem';
import opacity from 'postcss5-opacity';
import unroot from 'postcss-unroot';
import sourcemaps from 'gulp-sourcemaps';
import del from 'del';
import changed from 'gulp-changed';
import bs from 'browser-sync';
import useref from 'gulp-useref';
import rev from 'gulp-rev';
import revReplace from 'gulp-rev-replace';
import seq from 'gulp-sequence';
import imagemin from 'gulp-imagemin';
import webp from 'gulp-webp';
import webpack from 'webpack';
import WEBPACK_CFG from'./webpack.config.js';
import cached from 'gulp-cached';
import plumber from 'gulp-plumber';
import critical from 'critical';

// =============================
// CONFIGURATION
// =============================

// Build variables
const SOURCE = 'src/';
const DEST = 'dist/';

// BrowserSync init
const BS = bs.create();

// Configuration
const SASS_CFG = {
  indentType: 'tab',
  indentWidth: 2,
  linefeed: 'lf',
  outputStyle: 'expanded',
  precision: 3,
};

const POSTCSS_CFG = [
  autoprefixer({browsers: ['IE 8', 'IE 9', 'IE 10', '> 1%']}),
  pixrem({atrules: true}),
  opacity(),
  unroot(),
];



// =============================
// UTILITY TASKS
// =============================

// Delete dist/ folder
gulp.task('clean', () => (
  del(DEST)
));

gulp.task('clean:css', () => (
  del(path.resolve(DEST, './css'))
));

// Copy to dist/ folder
gulp.task('scafold', () => {
  //grab everything, which should include htaccess, robots, etc
    gulp.src([`${SOURCE}*`, `!${SOURCE}sass`])
      .pipe(changed(DEST))
      .pipe(gulp.dest(DEST))
      .pipe(BS.stream());

    //grab any hidden files too
    gulp.src(`${SOURCE}.*`)
      .pipe(changed(DEST))
      .pipe(gulp.dest(DEST))
      .pipe(BS.stream());

    // copy fonts
    gulp.src(`${SOURCE}*fonts/**/*`)
      .pipe(changed(DEST))
      .pipe(gulp.dest(DEST))
      .pipe(BS.stream());

    // copy images - will be overwritten with optimized images on build
    gulp.src(`${SOURCE}*images/**/*`)
      .pipe(changed(DEST))
      .pipe(gulp.dest(DEST))
      .pipe(BS.stream());
});

// Ready Browser-Sync
gulp.task('browserSync', () => (
  BS.init({
    server: {
      // work with data from dist/ folder
      baseDir: DEST,
    }
  })
));

// Concat and rename resources in html files
gulp.task('useref', () => (
  gulp.src(path.resolve(DEST, './*.html'))
    .pipe(plumber())
    .pipe(useref())
    .pipe(gulp.dest(DEST))
));



// =============================
// CACHE BUSTING
// =============================

// Create hash on css and js files
gulp.task('cache', () => (
  gulp.src([path.resolve(DEST, './css/*.css'), path.resolve(DEST, './js/*.js')], {base: DEST})
    .pipe(rev())
    .pipe(gulp.dest(DEST))
    .pipe(rev.manifest({
      merge: true,
    }))
    .pipe(gulp.dest(DEST))
));

// Rename refs in html files according manifest file
gulp.task('revreplace', ['cache'], () => {
  const manifest = gulp.src(path.resolve(DEST, './rev-manifest.json'));

  return gulp.src(path.resolve(DEST, './*.html'))
    .pipe(revReplace({manifest: manifest}))
    .pipe(gulp.dest(DEST));
});



// =============================
// CSS RELATED TASKS
// =============================

// Compile sass to css, run PostCSS plugins
gulp.task('sass', () => (
  gulp.src(`${SOURCE}/sass/main.scss`)
    .pipe(plumber({errorHandler: notify.onError("Failed to compile SASS")}))
    .pipe(changed(path.resolve(DEST, './css')))
    .pipe(sourcemaps.init())
    .pipe(sass(SASS_CFG).on('error', sass.logError))
    .pipe(postcss(POSTCSS_CFG))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(path.resolve(DEST, './css')))
    .pipe(plumber.stop())
    .pipe(BS.stream())
));

// Minify css
gulp.task('minify:css', ['sass'], () => (
  gulp.src(path.resolve(DEST, './css/main.css'))
    .pipe(postcss([
      cssnano({options: {safe: true, sourcemap: true}})
    ]))
    .pipe(gulp.dest(path.resolve(DEST, './css')))
    .pipe(BS.stream())
));

// FIXME: file is generated in wrong folder, additional test on perf necessary
// Generate inline Critical CSS
gulp.task('critical', () => (
  // critical.generate({
  //   inline: true,
  //   base: 'dist/',
  //   src: 'index.html',
  //   dest: 'ic.html',
  //   minify: true,
  //   ignore: ['@font-face', 'font-family', /.*font-feature-settings/],
  //   dimensions: [
  //     {
  //       width: 320,
  //       height: 500,
  //     },
  //     {
  //       width: 768,
  //       height: 1024,
  //     },
  //     {
  //       width: 1280,
  //       height: 1280,
  //     },
  //   ]
  // })
  console.log('critical CSS task')
));



// =============================
// JS RELATED TASKS
// =============================

// Run webpack on JS
gulp.task('js',(callback) => (
    webpack(WEBPACK_CFG, (err, stats) => {
        callback();
    })
));



// =============================
// IMAGE PROCESSING
// =============================

gulp.task('images', function(callback){
  gulp.src(`${DEST}./images/**/*.+(png|jpg|jpeg)`)
    .pipe(imagemin())
    .pipe(gulp.dest(`${DEST}./images`))
    .pipe(webp())
    .pipe(gulp.dest(`${DEST}./images`));
  gulp.src(`${DEST}./images/*.+(svg)`)
    .pipe(imagemin())
    .pipe(gulp.dest(`${DEST}./images`));
  callback();
});



// =============================
// BUILD SCRIPTS
// =============================

// Watchers
gulp.task('watch', ['browserSync', 'sass', 'js', 'scafold'], () => {
  gulp.watch(`${SOURCE}/sass/**/*.scss`, ['sass']);
  gulp.watch(`${SOURCE}/js/**/*.js`, ['js'], BS.reload);
  gulp.watch([`${SOURCE}*.html`, `${SOURCE}/images/**/*`, `${SOURCE}/fonts/*`], ['scafold']);
});

// Dev server
gulp.task('serve', ['watch']);

// Production-ready build
gulp.task('build', seq('clean', 'scafold', ['minify:css', 'js'], 'critical', 'useref', 'revreplace', 'images', 'browserSync'));

// TODO: versioning, git publishing
gulp.task('publish', ['browserSync', 'watch']);

// Default task
gulp.task('default', ['serve']);

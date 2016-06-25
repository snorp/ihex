var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    notify = require('gulp-notify'),
    babel = require('gulp-babel'),
    mocha = require('gulp-mocha');

var src = 'src/*.js';

gulp.task('lint', function() {
  return gulp.src(src)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .on('error', notify.onError('Error: <%= error.message %>'));
});

gulp.task('build', ['lint'], function() {
  return gulp.src(src)
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('lib'));
});

gulp.task('test', ['build'], function() {
  return gulp.src('test')
    .pipe(mocha());
});



gulp.task('default', ['build']);
# Homebrew restore list (2026-05-30)

During native-toolchain cleanup, `brew uninstall z3` (a leftover from a partial `brew
install llvm`) triggered Homebrew **autoremove**, which uninstalled 65 formulae —
including dependencies of `ffmpeg` and Gazebo/robotics (`sdformat14`, `ogre`). Left as-is
per user request. To restore the prior state at any time, run:

```bash
brew install aom aribb24 cairo cjson flac fontconfig frei0r fribidi giflib glib \
  gmp gnutls graphite2 harfbuzz highway icu4c@76 imath jpeg-turbo jpeg-xl leptonica \
  libarchive libass libb2 libbluray libdeflate libidn2 libmicrohttpd libogg librist \
  libsamplerate libsndfile libsoxr libssh libtasn1 libtiff libunibreak libvidstab \
  libvorbis libxext libxrender little-cms2 lzo mbedtls mbedtls@3 mpg123 nettle \
  opencore-amr openexr openjpeg openjph osrf/simulation/ogre1.9 p11-kit pango pixman \
  rav1e rubberband speex srt tesseract theora unbound webp xvid zeromq zimg
```

`brew install` does NOT trigger autoremove, so this restore is safe. (`brew missing` also
flagged `sdformat14` needing `osrf/simulation/gz-math7` and `gz-tools2`, which were not in
the autoremoved set and may predate this incident.)

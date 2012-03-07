(function() {
  var ParticleFilter, Prob, Rand, Robot, Util, Vector, _;

  _ = $._;

  Rand = {
    gauss_std: function() {
      var i;
      return _.reduce((function() {
        var _i, _len, _ref, _results;
        _ref = [0, 0, 0];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(Math.random() * 2 - 1);
        }
        return _results;
      })(), function(a, b) {
        return a + b;
      });
    },
    gauss: function(mean, sigma) {
      return mean + Rand.gauss_std() * sigma;
    }
  };

  Prob = {
    guassian: function(mu, sigma, x) {
      var sigma2;
      sigma2 = Math.pow(sigma, 2);
      return Math.exp(-(Math.pow(mu - x, 2) / sigma2 / 2.0 / Math.sqrt(2 * Math.PI * sigma2)));
    }
  };

  Util = {
    mod: function(x, y) {
      return ((x % y) + y) % y;
    }
  };

  Vector = (function() {

    function Vector(x, y) {
      if (x == null) x = 0;
      if (y == null) y = x;
      if (typeof x === 'object') {
        this.x = x.x, this.y = x.y;
      } else {
        this.x = x;
        this.y = y;
      }
    }

    Vector.add = function(lhs, rhs) {
      return new Vector(lhs.x + rhs.x, lhs.y + rhs.y);
    };

    Vector.subtract = function(lhs, rhs) {
      return new Vector(lhs.x - rhs.x, lhs.y - rhs.y);
    };

    Vector.multiply = function(lhs, rhs) {
      return new Vector(lhs.x * rhs, lhs.y * rhs);
    };

    Vector.divide = function(lsh, rhs) {
      return new Vector(lhs.x / rhs, lhs.y / rhs);
    };

    Vector.fromAngle = function(ang) {
      return new Vector(Math.cos(ang), Math.sin(ang));
    };

    Vector.random = function(xMax, yMax) {
      if (xMax == null) xMax = 1;
      if (yMax == null) yMax = xMax;
      return new Vector(Math.random() * xMax, Math.random() * yMax);
    };

    Vector.prototype.length = function() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    Vector.prototype.lengthSquared = function() {
      return this.x * this.x + this.y * this.y;
    };

    Vector.prototype.clone = function() {
      return new Vector(this);
    };

    Vector.prototype.toString = function() {
      return "{" + this.x + ", " + this.y + "}";
    };

    return Vector;

  })();

  Robot = (function() {

    function Robot(pos, ang) {
      this.pos = pos;
      this.ang = ang;
      this.noise = {
        turn: 0.0,
        move: 0.0,
        measure: 0.0
      };
    }

    Robot.prototype.move = function(ang, len) {
      this.ang += ang + Rand.gauss(0.0, this.noise.turn);
      this.pos = Vector.add(this.pos, Vector.multiply(Vector.fromAngle(this.ang), len + Rand.gauss(0.0, this.noise.move)));
      this.pos.x = Util.mod(this.pos.x, 512);
      return this.pos.y = Util.mod(this.pos.y, 512);
    };

    Robot.prototype.sense = function(landmarks) {
      var _this = this;
      return _.map(landmarks, function(lm) {
        return Vector.subtract(_this.pos, lm).length() + Rand.gauss(0.0, _this.noise.measure);
      });
    };

    Robot.prototype.clone = function() {
      var ret;
      ret = new Robot(this.pos.clone(), this.ang);
      ret.noise = {
        turn: this.noise.turn,
        move: this.noise.move,
        measure: this.noise.measure
      };
      return ret;
    };

    Robot.prototype.draw = function(g, size) {
      var np;
      if (size == null) size = 10;
      if (size === 5) {
        g.fillStyle = '#f0f';
        g.fillRect(this.pos.x, this.pos.y, 1, 1);
        return;
      }
      g.lineWidth = 1;
      g.strokeStyle = '#0000ff';
      g.beginPath();
      g.arc(this.pos.x, this.pos.y, size, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(this.pos.x, this.pos.y);
      np = Vector.add(this.pos, Vector.multiply(Vector.fromAngle(this.ang), size * 1.2));
      g.lineTo(np.x, np.y);
      return g.stroke();
    };

    return Robot;

  })();

  ParticleFilter = (function() {

    function ParticleFilter(bot, landmarks, num) {
      var i;
      this.bot = bot;
      this.landmarks = landmarks;
      this.num = num != null ? num : 10000;
      this.particles = (function() {
        var _ref, _results;
        _results = [];
        for (i = 0, _ref = this.num; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          _results.push(new Robot(Vector.random(512, 512), Math.random() * Math.PI * 2));
        }
        return _results;
      }).call(this);
    }

    ParticleFilter.prototype.move = function(ang, len) {
      var p, _i, _len, _ref, _results;
      _ref = this.particles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.move(ang, len));
      }
      return _results;
    };

    ParticleFilter.prototype.setNoise = function(noise) {
      var p, _i, _len, _ref, _results;
      _ref = this.particles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.noise = noise);
      }
      return _results;
    };

    ParticleFilter.prototype.weight = function(data) {
      var dist, n, p, _i, _len, _ref, _ref2;
      _ref = this.particles;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        p.weight = 1;
        for (n = 0, _ref2 = this.landmarks.length; 0 <= _ref2 ? n < _ref2 : n > _ref2; 0 <= _ref2 ? n++ : n--) {
          dist = Vector.subtract(p.pos, this.landmarks[n]).length();
          p.weight *= Prob.guassian(dist, p.noise.measure, data[n]);
        }
      }
    };

    ParticleFilter.prototype.resample = function() {
      var b, i, idx, max, par, _ref;
      par = [];
      max = _.chain(this.particles).pluck('weight').max().value() * 2;
      idx = parseInt(Math.random() * this.num);
      b = 0;
      for (i = 0, _ref = this.num; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        b += Math.random() * max;
        while (this.particles[idx].weight < b) {
          b -= this.particles[idx].weight;
          idx = (idx + 1) % this.num;
        }
        par.push(this.particles[idx].clone());
      }
      return this.particles = par;
    };

    ParticleFilter.prototype.draw = function(g) {
      var p, _i, _len, _ref, _results;
      _ref = this.particles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.draw(g, 5));
      }
      return _results;
    };

    return ParticleFilter;

  })();

  $.domReady(function() {
    var bot, canvas, ctx, draw, filter, i, landmarks;
    canvas = $('#target')[0];
    ctx = canvas.getContext('2d');
    bot = new Robot(Vector.random(512), Math.random() * Math.PI * 2);
    document.bot = bot;
    landmarks = (function() {
      var _results;
      _results = [];
      for (i = 1; i <= 3; i++) {
        _results.push(Vector.random(512, 512));
      }
      return _results;
    })();
    document.landmarks = landmarks;
    filter = new ParticleFilter(bot, landmarks);
    filter.setNoise({
      move: 0.05,
      turn: 0.05,
      measure: 5.0
    });
    return setTimeout(draw = function() {
      var lm, _i, _len;
      ctx.clearRect(0, 0, 512, 512);
      bot.move(0, 5);
      filter.move(0, 5);
      filter.weight(bot.sense(landmarks));
      filter.resample();
      bot.draw(ctx);
      filter.draw(ctx);
      for (_i = 0, _len = landmarks.length; _i < _len; _i++) {
        lm = landmarks[_i];
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      return setTimeout(draw, 100);
    }, 1000);
  });

}).call(this);

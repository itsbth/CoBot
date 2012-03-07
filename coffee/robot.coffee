{_} = $

Rand =
  gauss_std: ->
    _.reduce(Math.random() * 2 - 1 for i in [0, 0, 0], (a, b) -> a + b)

  gauss: (mean, sigma) ->
    mean + Rand.gauss_std() * sigma

Prob =
  guassian: (mu, sigma, x) ->
    sigma2 = Math.pow(sigma, 2)
    Math.exp -(Math.pow(mu - x, 2) / sigma2 / 2.0 / Math.sqrt(2 * Math.PI * sigma2))

Util =
  mod: (x, y) ->
    ((x % y) + y) % y

class Vector
  constructor: (x=0, y=x) ->
    if typeof x is 'object'
      {@x, @y} = x
    else
      @x = x
      @y = y

  @add: (lhs, rhs) ->
    new Vector lhs.x + rhs.x, lhs.y + rhs.y

  @subtract: (lhs, rhs) ->
    new Vector lhs.x - rhs.x, lhs.y - rhs.y

  @multiply: (lhs, rhs) ->
    new Vector lhs.x * rhs, lhs.y * rhs

  @divide: (lsh, rhs) ->
    new Vector lhs.x / rhs, lhs.y / rhs

  @fromAngle: (ang) ->
    new Vector Math.cos(ang), Math.sin(ang)

  @random: (xMax=1, yMax=xMax) ->
    new Vector Math.random() * xMax, Math.random() * yMax

  length: ->
    Math.sqrt @x*@x + @y*@y

  lengthSquared: ->
    @x*@x + @y*@y

  clone: -> new Vector @

  toString: ->
    "{#{@x}, #{@y}}"

class Robot
  constructor: (@pos, @ang) ->
    @noise =
      turn: 0.0
      move: 0.0
      measure: 0.0

  move: (ang, len) ->
    @ang += ang + Rand.gauss(0.0, @noise.turn)
    @pos = Vector.add @pos, Vector.multiply(Vector.fromAngle(@ang), len + Rand.gauss(0.0, @noise.move))
    @pos.x = Util.mod @pos.x, 512
    @pos.y = Util.mod @pos.y, 512

  sense: (landmarks) ->
    _.map landmarks, (lm) =>
      Vector.subtract(@pos, lm).length() + Rand.gauss(0.0, @noise.measure)

  clone: ->
    ret = new Robot @pos.clone(), @ang
    ret.noise = turn: @noise.turn, move: @noise.move, measure: @noise.measure
    ret

  draw: (g, size=10) ->
    if size is 5
      g.fillStyle = '#f0f'
      g.fillRect @pos.x, @pos.y, 1, 1
      return
    g.lineWidth = 1
    g.strokeStyle = '#0000ff'
    g.beginPath()
    g.arc(@pos.x, @pos.y, size, 0, Math.PI * 2)
    g.stroke()

    g.beginPath()
    g.moveTo(@pos.x, @pos.y)
    np = Vector.add @pos, Vector.multiply(Vector.fromAngle(@ang), size*1.2)
    g.lineTo np.x, np.y
    g.stroke()

class ParticleFilter
  constructor: (@bot, @landmarks, @num=10000) ->
    @particles =
      new Robot(Vector.random(512, 512), Math.random() * Math.PI * 2) for i in [0...@num]

  move: (ang, len) ->
    p.move ang, len for p in @particles

  setNoise: (noise) ->
    p.noise = noise for p in @particles

  weight: (data) ->
    for p in @particles
      p.weight = 1
      for n in [0...@landmarks.length]
        dist = Vector.subtract(p.pos, @landmarks[n]).length()
        p.weight *= Prob.guassian dist, p.noise.measure, data[n]
    return

  resample: () ->
    par = []
    max = _.chain(@particles).pluck('weight').max().value() * 2
    idx = parseInt(Math.random() * @num)
    b = 0
    for i in [0...@num]
      b += Math.random() * max
      while @particles[idx].weight < b
        b -= @particles[idx].weight
        idx = (idx + 1) % @num
      par.push @particles[idx].clone()
    @particles = par

  draw: (g) ->
    p.draw g, 5 for p in @particles

$.domReady ->
  canvas = $('#target')[0]
  ctx = canvas.getContext '2d'
  bot = new Robot(Vector.random(512), Math.random() * Math.PI * 2)
  document.bot = bot

  landmarks =
    Vector.random(512, 512) for i in [1..3]
  document.landmarks = landmarks

  filter = new ParticleFilter bot, landmarks
  filter.setNoise move: 0.05, turn: 0.05, measure: 5.0

  setTimeout draw = ->
    ctx.clearRect 0, 0, 512, 512

    bot.move 0, 5
    filter.move 0, 5
    filter.weight(bot.sense(landmarks))
    filter.resample()

    bot.draw ctx
    filter.draw ctx

    for lm in landmarks
      ctx.lineWidth = 2
      ctx.strokeStyle = 'red'
      ctx.beginPath()
      ctx.arc lm.x, lm.y, 5, 0, Math.PI * 2
      ctx.stroke()
    setTimeout draw, 100
  , 1000
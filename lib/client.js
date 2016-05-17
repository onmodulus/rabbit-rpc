const Uuid = require('uuid');

const Channel = require('./channel');

module.exports = function Client(url, opts) {
  return function (queue, data, done) {
    Channel(url, opts, function (err, ch, conn) {
      if (err) return done(err);

      function close () {
        conn.close();
        done.apply(null, arguments);
      }

      ch.on('error', done);
      ch.assertQueue('', { exclusive: true }, function (err, q) {
        var corr, opts;

        if (err) return done(err);

        corr = Uuid.v4();
        opts = { correlationId: corr, replyTo: q.queue };

        function handleReply (msg) {
          var result;

          if (msg.properties.correlationId !== corr) return;

          // TODO try/catch
          result = JSON.parse(msg.content.toString());

          if (msg.properties.type === 'error') close(result);
          else close(null, result);
        }

        ch.consume(q.queue, handleReply, { noAck: true });
        ch.sendToQueue(queue, new Buffer(JSON.stringify(data)), opts);
      });
    });
  };
};
"""The main entrypoint for running the web server."""
import sanic
import traceback
import jinja2

from src.utils.config import ServerConf

_CONF = ServerConf()

# Initialize the Sanic app object
app = sanic.Sanic('navigator', strict_slashes=False)
app.config.URL_PREFIX = _CONF.url_prefix
app.config.KBASE_ENDPOINT = _CONF.kbase_endpoint
app.config.KBASE_UI_ROOT = _CONF.kbase_root
app.static('/static', _CONF.app_root_path + '/src/static')

# Initialize the Jinja2 templating object
jinja_env = jinja2.Environment(
    loader=jinja2.PackageLoader('src', 'templates'),
    autoescape=jinja2.select_autoescape(['html'])
)


@app.route('/static/build/bundle.js', methods=['GET'])
async def js(req):
    """
    We handle the bundle.js as a special endpoint so we can serve the gzip
    file and set the Content-Encoding header.
    """
    return await sanic.response.file(
        _CONF.app_root_path + '/src/static/build/bundle.js.gz',
        headers={'Content-Encoding': 'gzip', 'Content-Type': 'application/javascript'}
    )


@app.route('/', methods=['GET'])
@app.route('/<suffix:path>', methods=['GET'])
async def narratives(request, suffix=None):
    """Narratives"""
    opts = {'template': 'layout-legacy.html'}
    return _render_template('narratives/index.html', opts)

@app.exception(sanic.exceptions.NotFound)
async def page_not_found(request, err):
    """404 not found."""
    print('404:', request.path)
    return _render_template('404.html', {'template': 'layout-legacy.html'}, status=404)


@app.exception(Exception)
async def server_error(request, err):
    """Any other unhandled exceptions show a 500 error page."""
    print('=' * 80)
    print('500 Unexpected Server Error')
    print('-' * 80)
    traceback.print_exc()
    print('=' * 80)
    return _render_template('500.html', status=500)


def _url_for(arg, *args, **kwargs):
    """
    A wrapper around app.url_for that injects a configurable prefix.
    For example, if we are serving via nginx proxy at /services/react-ui
    then we want our links to look like "/services/react-ui/{link_path}"
    """
    url = app.url_for(arg, *args, **kwargs)
    # Note that _CONF.url_prefix will have leading slash and no trailing slash
    return _CONF.url_prefix + '/' + url.strip('/')


def _render_template(path, args=None, status=200):
    """
    Render a jinja template and return it as a sanic html response.
    Set some default template variables (eg. `app` and `url_for`).
    """
    template = jinja_env.get_template(path)
    if not args:
        args = {}
    args['app'] = app
    args['url_for'] = _url_for
    args.setdefault('template', 'layout-legacy.html')
    args.setdefault('path_prefix', '')
    args['url_prefix'] = _CONF.url_prefix + args['path_prefix']
    html = template.render(**args)
    return sanic.response.html(html, status=status)


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',  # nosec
        port=_CONF.server_port,
        workers=_CONF.n_workers,
        access_log=_CONF.access_logging or _CONF.development,
        debug=_CONF.development,
        auto_reload=False  # handled by entr in development
    )

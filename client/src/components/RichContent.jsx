import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function urlTransform(url) {
  if (url.startsWith('data:image/svg+xml')) return url;
  if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:')) return url;
  return '';
}

const inlineCodeSx = {
  px: 0.6,
  py: 0.15,
  borderRadius: 0.8,
  bgcolor: 'action.hover',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '0.88em',
};

const blockSx = {
  overflowX: 'auto',
  my: 1.5,
  p: 1.5,
  borderRadius: 2,
  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#141414' : '#f3f3f1'),
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 13.5,
  lineHeight: 1.55,
};

export default function RichContent({ text }) {
  return (
    <Box sx={{ overflowWrap: 'anywhere', '& > :first-child': { mt: 0 }, '& > :last-child': { mb: 0 } }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
        components={{
          p: ({ children }) => <Box component="p" sx={{ my: 1, lineHeight: 1.65 }}>{children}</Box>,
          h1: ({ children }) => <Box component="h2" sx={{ fontSize: '1.25rem', fontWeight: 680, mt: 2, mb: 1 }}>{children}</Box>,
          h2: ({ children }) => <Box component="h3" sx={{ fontSize: '1.1rem', fontWeight: 680, mt: 2, mb: 1 }}>{children}</Box>,
          h3: ({ children }) => <Box component="h4" sx={{ fontSize: '1rem', fontWeight: 680, mt: 1.75, mb: 0.75 }}>{children}</Box>,
          ul: ({ children }) => <Box component="ul" sx={{ my: 1, pl: 2.5, '& li': { mt: 0.45 } }}>{children}</Box>,
          ol: ({ children }) => <Box component="ol" sx={{ my: 1, pl: 2.5, '& li': { mt: 0.45 } }}>{children}</Box>,
          a: ({ href, children }) => (
            <Box component="a" href={href} target="_blank" rel="noreferrer" sx={{ color: 'primary.main' }}>
              {children}
            </Box>
          ),
          blockquote: ({ children }) => (
            <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5, my: 1.5, color: 'text.secondary' }}>
              {children}
            </Box>
          ),
          table: ({ children }) => (
            <Box sx={{ overflowX: 'auto', my: 1.5 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.94rem' }}>
                {children}
              </Box>
            </Box>
          ),
          th: ({ children }) => (
            <Box component="th" sx={{ border: '1px solid', borderColor: 'divider', px: 1.25, py: 0.9, textAlign: 'left', bgcolor: 'action.hover', fontWeight: 650, '& p': { m: 0 } }}>
              {children}
            </Box>
          ),
          td: ({ children }) => (
            <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', px: 1.25, py: 0.9, verticalAlign: 'top', '& p': { m: 0 } }}>
              {children}
            </Box>
          ),
          img: ({ src, alt }) => (
            <Box
              component="img"
              src={src}
              alt={alt || ''}
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              sx={{ display: 'block', maxWidth: '100%', borderRadius: 2, my: 1.5 }}
            />
          ),
          pre: ({ children }) => (
            <Box component="pre" sx={blockSx}>{children}</Box>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className) || String(children).includes('\n');
            if (isBlock) return <Box component="code" className={className}>{children}</Box>;
            return <Box component="code" sx={inlineCodeSx}>{children}</Box>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

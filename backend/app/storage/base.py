class StorageError(Exception):
    pass


class Storage:
    def save(self, relative_path: str, stream) -> dict:
        raise NotImplementedError

    def open(self, relative_path: str):
        raise NotImplementedError

    def delete(self, relative_path: str) -> bool:
        raise NotImplementedError

    def exists(self, relative_path: str) -> bool:
        raise NotImplementedError
